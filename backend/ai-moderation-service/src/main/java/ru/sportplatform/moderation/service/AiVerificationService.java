package ru.sportplatform.moderation.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.CommentVerificationRequest;
import ru.sportplatform.common.dto.CommentVerificationResult;
import ru.sportplatform.common.dto.EventVerificationRequest;
import ru.sportplatform.common.dto.EventVerificationResult;
import ru.sportplatform.common.dto.SportNormalizeRequest;
import ru.sportplatform.common.dto.SportNormalizeResult;
import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.AiStatus;
import ru.sportplatform.common.enums.Audience;
import ru.sportplatform.common.enums.EventVerificationMode;
import ru.sportplatform.common.policy.ProhibitedContentScanner;
import ru.sportplatform.common.policy.SevereContentPolicy;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.moderation.ai.EventQualityGuardian;
import ru.sportplatform.moderation.ai.HeuristicAnalyzer;
import ru.sportplatform.moderation.ai.HeuristicAnalyzer.HeuristicResult;
import ru.sportplatform.moderation.ai.LlmClient;
import ru.sportplatform.moderation.ai.LlmClient.LlmVerdict;
import ru.sportplatform.moderation.ai.SportTypeNormalizer;
import ru.sportplatform.moderation.domain.AiVerdict;
import ru.sportplatform.moderation.domain.ModerationSettings;
import ru.sportplatform.moderation.repository.AiVerdictRepository;
import ru.sportplatform.moderation.web.dto.VerdictDto;

@Service
@RequiredArgsConstructor
public class AiVerificationService {

    private static final String GUARDIAN = "EVENT_QUALITY_GUARDIAN";
    private static final String CURATOR = "SPORT_TYPE_CURATOR";

    private final HeuristicAnalyzer heuristics;
    private final EventQualityGuardian guardian;
    private final SportTypeNormalizer sportNormalizer;
    private final LlmClient llm;
    private final SettingsService settingsService;
    private final AiVerdictRepository verdicts;
    private final AiAuditService audit;

    /**
     * Итоговый вердикт = эвристика ∪ LLM: нарушение засчитывается, если его нашёл хотя бы один анализатор,
     * а «безопасно для детей» — только если согласны оба.
     */
    @Transactional
    public EventVerificationResult verifyEvent(EventVerificationRequest request) {
        long started = System.currentTimeMillis();
        ModerationSettings settings = settingsService.current();
        boolean draft = request.mode() == EventVerificationMode.DRAFT;

        if (!settings.isAiEnabled()) {
            AgeRestriction age = request.audience() == Audience.ADULTS ? AgeRestriction.ADULT_ONLY : AgeRestriction.CHILD_SAFE;
            EventVerificationResult result = new EventVerificationResult(null, AiStatus.AI_APPROVED, age,
                    "ИИ-проверка отключена администратором — событие опубликовано без автоматической проверки.",
                    List.of(), List.of(), "DISABLED", false, Instant.now(), List.of(), List.of());
            audit.log(GUARDIAN, request.title(), "DISABLED", "DISABLED", System.currentTimeMillis() - started, null);
            return draft ? result : save(request, result);
        }

        HeuristicResult heuristic = heuristics.analyzeEvent(request.title(), request.description(), request.conditions(),
                request.audience(), request.startAt(), settings.getCustomStopWords());
        Optional<LlmVerdict> llmVerdict = settings.isLlmEnabled() ? llm.verify(request) : Optional.empty();

        boolean flagged = heuristic.isFlagged() || llmVerdict.map(LlmVerdict::flagged).orElse(false);
        boolean adultOnly = heuristic.isAdultOnly() || flagged || llmVerdict.map(v -> !v.childSafe()).orElse(false);
        AgeRestriction age = adultOnly ? AgeRestriction.ADULT_ONLY : AgeRestriction.CHILD_SAFE;

        LinkedHashSet<String> reasons = new LinkedHashSet<>(heuristic.flagged());
        llmVerdict.ifPresent(v -> v.reasons().stream().filter(r -> !TextUtils.isBlank(r)).map(r -> "LLM: " + r).forEach(reasons::add));
        if (adultOnly) {
            reasons.addAll(heuristic.adultReasons());
        } else {
            reasons.addAll(heuristic.kidsReasons());
        }

        boolean instantRemoval = ProhibitedContentScanner.requiresInstantBan(request.title(), request.description(),
                request.conditions())
                || SevereContentPolicy.requiresInstantRemoval(new ArrayList<>(reasons));
        boolean hold = flagged && settings.isAutoHoldFlagged() && !instantRemoval;
        String summary = summary(flagged, adultOnly, hold, instantRemoval, request.organizationEvent(), heuristic, llmVerdict);
        String source = llmVerdict.isPresent() ? "LLM+HEURISTIC" : "HEURISTIC";
        var suggestions = guardian.suggestions(request, heuristic, age);
        var variants = guardian.descriptionVariants(request);

        EventVerificationResult result = new EventVerificationResult(null,
                flagged ? AiStatus.FLAGGED : AiStatus.AI_APPROVED,
                age,
                summary,
                new ArrayList<>(reasons),
                heuristic.recommendations(),
                source,
                hold,
                Instant.now(),
                suggestions,
                variants);

        audit.log(GUARDIAN, request.title() + "|" + nz(request.description()),
                flagged ? "FLAGGED" : "AI_APPROVED", source, System.currentTimeMillis() - started, null);
        if (hold) {
            audit.log(GUARDIAN, "hold:" + request.title(), "HOLD", source, 0, null);
        }
        return draft ? result : save(request, result);
    }

    @Transactional
    public SportNormalizeResult normalizeSport(SportNormalizeRequest request) {
        long started = System.currentTimeMillis();
        SportNormalizeResult result = sportNormalizer.normalize(request.query(), request.knownNames());
        audit.log(CURATOR, request.query(), result.acceptable() ? "PROPOSED" : "REJECTED", result.source(),
                System.currentTimeMillis() - started, null);
        return result;
    }

    @Transactional
    public CommentVerificationResult verifyComment(CommentVerificationRequest request) {
        ModerationSettings settings = settingsService.current();
        if (!settings.isAiEnabled()) {
            return new CommentVerificationResult(false, false, null);
        }
        List<String> flagged = heuristics.analyzeComment(request.text(), settings.getCustomStopWords());
        if (flagged.isEmpty()) {
            return new CommentVerificationResult(false, false, null);
        }
        return new CommentVerificationResult(true, settings.isCommentFilterEnabled(),
                "Скрыто ИИ-модератором: " + String.join(", ", flagged).toLowerCase());
    }

    @Transactional(readOnly = true)
    public List<VerdictDto> recent() {
        return verdicts.findTop100ByOrderByCreatedAtDesc().stream()
                .map(v -> new VerdictDto(v.getId(), v.getEventId(), v.getEventTitle(), v.getOrganizerName(),
                        v.isOrganizationEvent(), v.getStatus(), v.getAgeRestriction(), v.getSummary(),
                        TextUtils.isBlank(v.getReasons()) ? List.of() : Arrays.asList(v.getReasons().split("\n")),
                        v.getSource(), v.isHold(), v.getCreatedAt()))
                .toList();
    }

    private EventVerificationResult save(EventVerificationRequest request, EventVerificationResult result) {
        AiVerdict verdict = verdicts.save(AiVerdict.builder()
                .eventId(request.eventId())
                .eventTitle(request.title())
                .organizerName(request.organizerName())
                .organizationEvent(request.organizationEvent())
                .status(result.status())
                .ageRestriction(result.ageRestriction())
                .summary(result.summary())
                .reasons(String.join("\n", result.reasons()))
                .source(result.source())
                .hold(result.hold())
                .build());
        return new EventVerificationResult(verdict.getId(), result.status(), result.ageRestriction(), result.summary(),
                result.reasons(), result.recommendations(), result.source(), result.hold(), result.checkedAt(),
                result.suggestions(), result.descriptionVariants());
    }

    private static String summary(boolean flagged, boolean adultOnly, boolean hold, boolean instantRemoval,
                                  boolean organizationEvent, HeuristicResult heuristic, Optional<LlmVerdict> llmVerdict) {
        StringBuilder text = new StringBuilder();
        if (flagged) {
            if (instantRemoval) {
                text.append("Обнаружено запрещённое содержание. Мероприятие удалено автоматически, репутация организатора снижена. ");
            } else {
                text.append("Найдены возможные нарушения правил платформы. ");
            }
            if (instantRemoval) {
                // summary уже задан выше
            } else if (organizationEvent) {
                text.append("Допущенная организация пublикует без премодерации — администратор получил сигнал. ");
            } else if (hold) {
                text.append("Событие отправлено администратору на проверку и пока не видно в ленте. ");
            } else {
                text.append("Событие опубликовано, администратор получил сигнал. ");
            }
        } else {
            text.append("Нарушений не найдено. ");
            text.append(adultOnly ? "Возрастной допуск 18+. " : "Подходит для детей. ");
        }
        llmVerdict.map(LlmVerdict::summary).filter(s -> !TextUtils.isBlank(s)).ifPresent(s -> text.append(s.trim()).append(' '));
        if (!heuristic.recommendations().isEmpty() && !flagged) {
            text.append("Есть советы, как сделать карточку понятнее.");
        }
        return text.toString().trim();
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }
}
