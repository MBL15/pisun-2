package ru.sportplatform.event.service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.SportCurationRequest;
import ru.sportplatform.common.dto.SportCurationResult;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.event.client.AiClient;
import ru.sportplatform.event.domain.SportEvent;
import ru.sportplatform.event.domain.SportType;
import ru.sportplatform.event.repository.SportEventRepository;
import ru.sportplatform.event.repository.SportTypeRepository;
import ru.sportplatform.event.web.dto.SportTypeDto;

/**
 * Куратор справочника предлагает похожие виды, проверяет новый и готовит слияния.
 * Сам ничего не удаляет: новый вид появляется только по явной заявке пользователя,
 * слияние — только после подтверждения администратора.
 */
@Service
@RequiredArgsConstructor
public class SportCuratorService {

    private static final double SUGGEST = 0.72;
    private static final double SAME = 0.84;
    private static final Pattern FORBIDDEN = Pattern.compile(
            "ставк|казино|алкогол|пиво|наркот|х[уy]й|пизд|бляд|мудак|сука",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.UNICODE_CHARACTER_CLASS);
    private static final Pattern URL = Pattern.compile("https?://|t\\.me/|www\\.", Pattern.CASE_INSENSITIVE);

    private final SportTypeRepository sportTypes;
    private final SportEventRepository events;
    private final SportTypeService sports;
    private final AiClient ai;

    @Transactional(readOnly = true)
    public List<SportHit> suggest(String query) {
        if (TextUtils.isBlank(query) || TextUtils.normalizeKey(query).length() < 2) {
            return List.of();
        }
        return sportTypes.findByArchivedFalseOrderByCustomAscNameAsc().stream()
                .map(sport -> new Scored(sport, FuzzySportMatcher.score(query, sport.getName())))
                .filter(scored -> scored.score() >= SUGGEST)
                .sorted(Comparator.comparingDouble(Scored::score).reversed())
                .limit(5)
                .map(scored -> new SportHit(sports.toDto(scored.sport()), scored.score(), message(query, scored)))
                .toList();
    }

    @Transactional
    public SportProposal propose(CurrentUser current, String name, String description) {
        current.requireAuthenticated();
        String pretty = TextUtils.prettify(name);
        String key = TextUtils.normalizeKey(pretty);
        if (key.length() < 2) {
            throw ApiException.badRequest("Название вида спорта слишком короткое — напишите хотя бы два символа");
        }
        String rejection = localRejection(pretty, description);
        if (rejection != null) {
            ai.audit("CURATOR", "PROPOSE", "REJECTED", "HEURISTIC", rejection);
            return SportProposal.rejected(rejection, suggest(pretty));
        }

        List<SportHit> similar = suggest(pretty);
        if (!similar.isEmpty() && similar.get(0).confidence() >= SAME) {
            SportHit best = similar.get(0);
            ai.audit("CURATOR", "PROPOSE", "MATCH", "HEURISTIC", best.message());
            return new SportProposal("MATCH", best.message(), best.sport(), similar, best.sport().name(),
                    best.sport().category(), best.sport().defaultAge(), best.sport().icon());
        }

        SportCurationResult curation = ai.curateSport(new SportCurationRequest(pretty, description));
        if (curation != null && "LLM".equals(curation.source()) && !curation.adequate()) {
            String reason = TextUtils.isBlank(curation.reason())
                    ? "Это не похоже на вид спорта. Опишите активность иначе или выберите направление из списка."
                    : curation.reason();
            ai.audit("CURATOR", "PROPOSE", "REJECTED", "LLM", reason);
            return SportProposal.rejected(reason, similar);
        }

        String canonical = pretty;
        if (curation != null && !TextUtils.isBlank(curation.canonicalName())) {
            canonical = TextUtils.prettify(curation.canonicalName());
        }
        SportType existing = sportTypes.findByNameKey(TextUtils.normalizeKey(canonical)).orElse(null);
        if (existing != null) {
            existing.setArchived(false);
            SportTypeDto dto = sports.toDto(existing);
            return new SportProposal("MATCH", "Уже есть «" + existing.getName() + "» — выбрать его?",
                    dto, similar, existing.getName(), existing.getCategory(), existing.getDefaultAge(), existing.getIcon());
        }

        SportType created = sports.findOrCreate(canonical, current.id());
        if (curation != null && !TextUtils.isBlank(curation.category())) {
            created.setCategory(curation.category());
        }
        if (curation != null) {
            created.setDefaultAge(curation.childSafe() ? "CHILD_SAFE" : "ADULT_ONLY");
        }
        if (!TextUtils.isBlank(description)) {
            created.setDescription(description.trim());
        }
        SportProfiles.apply(created);
        ai.audit("CURATOR", "PROPOSE", "ADDED", curation == null ? "HEURISTIC" : curation.source(),
                "В справочник добавлен «" + created.getName() + "»");
        return new SportProposal("ADDED",
                "«" + created.getName() + "» добавлен в справочник. Его можно выбрать для мероприятия.",
                sports.toDto(created), similar, created.getName(), created.getCategory(), created.getDefaultAge(), created.getIcon());
    }

    @Transactional(readOnly = true)
    public List<MergeProposal> mergeProposals(CurrentUser current) {
        current.requireAdmin();
        List<SportType> all = sportTypes.findByArchivedFalseOrderByCustomAscNameAsc();
        List<MergeProposal> proposals = new ArrayList<>();
        for (int i = 0; i < all.size(); i++) {
            for (int j = i + 1; j < all.size(); j++) {
                SportType left = all.get(i);
                SportType right = all.get(j);
                if (!left.isCustom() && !right.isCustom()) {
                    continue;
                }
                double score = FuzzySportMatcher.score(left.getName(), right.getName());
                if (score < SUGGEST) {
                    continue;
                }
                SportType source = preferSource(left, right);
                SportType target = source == left ? right : left;
                proposals.add(new MergeProposal(sports.toDto(source), sports.toDto(target), score,
                        "«" + source.getName() + "» похоже на «" + target.getName()
                                + "». Слияние перенесёт события и не удалит их."));
            }
        }
        return proposals.stream()
                .sorted(Comparator.comparingDouble(MergeProposal::confidence).reversed())
                .limit(20)
                .toList();
    }

    @Transactional
    public SportTypeDto merge(Long sourceId, Long targetId) {
        if (sourceId.equals(targetId)) {
            throw ApiException.badRequest("Нельзя слить вид спорта сам с собой");
        }
        SportType source = sportTypes.findById(sourceId)
                .orElseThrow(() -> ApiException.notFound("Вид спорта #" + sourceId + " не найден"));
        SportType target = sportTypes.findById(targetId)
                .orElseThrow(() -> ApiException.notFound("Вид спорта #" + targetId + " не найден"));
        if (target.isArchived()) {
            throw ApiException.badRequest("Канонический вид «" + target.getName() + "» уже скрыт. Выберите другой.");
        }
        for (SportEvent event : events.findBySportTypeId(source.getId())) {
            event.setSportType(target);
        }
        source.setArchived(true);
        return sports.toDto(target);
    }

    @Transactional(readOnly = true)
    public SportMetrics metrics(CurrentUser current) {
        current.requireAdmin();
        Instant weekAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        Instant orphanBefore = Instant.now().minus(90, ChronoUnit.DAYS);
        List<SportTypeDto> all = sportTypes.findByArchivedFalseOrderByCustomAscNameAsc().stream()
                .map(sports::toDto)
                .toList();
        List<SportTypeDto> top = all.stream()
                .sorted(Comparator.comparingLong(SportTypeDto::eventsCount).reversed())
                .filter(sport -> sport.eventsCount() > 0)
                .limit(5)
                .toList();
        List<SportTypeDto> orphans = new ArrayList<>();
        List<SportTypeDto> recent = new ArrayList<>();
        for (SportType sport : sportTypes.findByArchivedFalseOrderByCustomAscNameAsc()) {
            if (!sport.isCustom()) {
                continue;
            }
            long total = events.countBySportTypeId(sport.getId());
            if (total == 0 && sport.getCreatedAt() != null && sport.getCreatedAt().isBefore(orphanBefore)) {
                orphans.add(sports.toDto(sport));
            }
            if (sport.getCreatedAt() != null && sport.getCreatedAt().isAfter(weekAgo)) {
                recent.add(sports.toDto(sport));
            }
        }
        return new SportMetrics(top, orphans, recent);
    }

    private static SportType preferSource(SportType left, SportType right) {
        if (left.isCustom() != right.isCustom()) {
            return left.isCustom() ? left : right;
        }
        return left.getName().length() >= right.getName().length() ? left : right;
    }

    private static String message(String query, Scored scored) {
        if (scored.score() >= SAME) {
            return "Уже есть «" + scored.sport().getName() + "» — выбрать его?";
        }
        return "Похоже на «" + scored.sport().getName() + "». Вы ввели «" + query.trim() + "».";
    }

    private static String localRejection(String name, String description) {
        String text = name + " " + (description == null ? "" : description);
        if (FORBIDDEN.matcher(text).find()) {
            return "Такое название нельзя добавить в справочник: оно не про спорт. Выберите направление из списка.";
        }
        if (URL.matcher(text).find()) {
            return "В названии не должно быть ссылок. Опишите сам вид спорта.";
        }
        String letters = name.replaceAll("[^\\p{L}]", "");
        if (letters.length() < 2 || letters.chars().distinct().count() < 3 && letters.length() > 3) {
            return "Название не похоже на вид спорта. Напишите, чем будут заниматься, обычными словами.";
        }
        if (name.trim().split("\\s+").length > 6) {
            return "Название слишком длинное. Оставьте короткий вид спорта, а подробности напишите в описании мероприятия.";
        }
        return null;
    }

    private record Scored(SportType sport, double score) {
    }

    public record SportHit(SportTypeDto sport, double confidence, String message) {
    }

    public record SportProposal(
            String decision,
            String message,
            SportTypeDto sport,
            List<SportHit> similar,
            String canonicalName,
            String category,
            String defaultAge,
            String icon
    ) {
        static SportProposal rejected(String message, List<SportHit> similar) {
            return new SportProposal("REJECTED", message, null, similar, null, null, null, null);
        }
    }

    public record MergeProposal(SportTypeDto source, SportTypeDto target, double confidence, String reason) {
    }

    public record SportMetrics(List<SportTypeDto> top, List<SportTypeDto> orphans, List<SportTypeDto> recent) {
    }
}
