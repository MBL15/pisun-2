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
import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.AiStatus;
import ru.sportplatform.common.enums.Audience;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.moderation.ai.HeuristicAnalyzer;
import ru.sportplatform.moderation.ai.HeuristicAnalyzer.HeuristicResult;
import ru.sportplatform.moderation.ai.LlmClient;
import ru.sportplatform.moderation.ai.LlmClient.LlmVerdict;
import ru.sportplatform.moderation.domain.AiVerdict;
import ru.sportplatform.moderation.domain.ModerationSettings;
import ru.sportplatform.moderation.repository.AiVerdictRepository;
import ru.sportplatform.moderation.web.dto.VerdictDto;

@Service
@RequiredArgsConstructor
public class AiVerificationService {

    private final HeuristicAnalyzer heuristics;
    private final LlmClient llm;
    private final SettingsService settingsService;
    private final AiVerdictRepository verdicts;

    /**
     * Итоговый вердикт = эвристика ∪ LLM: нарушение засчитывается, если его нашёл хотя бы один анализатор,
     * а «безопасно для детей» — только если согласны оба.
     */
    @Transactional
    public EventVerificationResult verifyEvent(EventVerificationRequest request) {
        ModerationSettings settings = settingsService.current();
        HeuristicResult heuristic = heuristics.analyzeEvent(request.title(), request.description(), request.conditions(),
                request.audience(), request.startAt(), settings.getCustomStopWords());
        if (heuristic.isHardBlocked()) {
            return save(request, blockedResult(heuristic));
        }
        if (!settings.isAiEnabled()) {
            AgeRestriction age = request.audience() == Audience.ADULTS ? AgeRestriction.ADULT_ONLY : AgeRestriction.CHILD_SAFE;
            return save(request, new EventVerificationResult(null, AiStatus.AI_APPROVED, age,
                    "ИИ-проверка отключена администратором — событие опубликовано без автоматической проверки.",
                    List.of(), List.of(), "DISABLED", false, false, Instant.now()));
        }
        Optional<LlmVerdict> llmVerdict = settings.isLlmEnabled() ? llm.verify(request) : Optional.empty();

        boolean blocked = heuristic.isHardBlocked();
        boolean flagged = blocked || heuristic.isFlagged() || llmVerdict.map(LlmVerdict::flagged).orElse(false);
        boolean adultOnly = heuristic.isAdultOnly() || flagged || llmVerdict.map(v -> !v.childSafe()).orElse(false);

        LinkedHashSet<String> reasons = new LinkedHashSet<>(heuristic.blockedReasons());
        reasons.addAll(heuristic.flagged());
        llmVerdict.ifPresent(v -> v.reasons().stream().filter(r -> !TextUtils.isBlank(r)).map(r -> "LLM: " + r).forEach(reasons::add));
        if (adultOnly) {
            reasons.addAll(heuristic.adultReasons());
        } else {
            reasons.addAll(heuristic.kidsReasons());
        }

        boolean hold = !blocked && flagged && settings.isAutoHoldFlagged();
        String summary = summary(blocked, flagged, adultOnly, hold, request.organizationEvent(), heuristic, llmVerdict);

        return save(request, new EventVerificationResult(null,
                flagged ? AiStatus.FLAGGED : AiStatus.AI_APPROVED,
                adultOnly ? AgeRestriction.ADULT_ONLY : AgeRestriction.CHILD_SAFE,
                summary,
                new ArrayList<>(reasons),
                heuristic.recommendations(),
                llmVerdict.isPresent() ? "LLM+HEURISTIC" : "HEURISTIC",
                hold,
                blocked,
                Instant.now()));
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

    private static EventVerificationResult blockedResult(HeuristicResult heuristic) {
        return new EventVerificationResult(null, AiStatus.FLAGGED, AgeRestriction.ADULT_ONLY,
                "В тексте найдены запрещённые слова — мероприятие заблокировано и не отправлено администратору. "
                        + "Исправьте описание и сохраните снова.",
                new ArrayList<>(heuristic.blockedReasons()),
                heuristic.recommendations(),
                "HEURISTIC",
                false,
                true,
                Instant.now());
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
                result.reasons(), result.recommendations(), result.source(), result.hold(), result.blocked(),
                result.checkedAt());
    }

    private static String summary(boolean blocked, boolean flagged, boolean adultOnly, boolean hold, boolean organizationEvent,
                                  HeuristicResult heuristic, Optional<LlmVerdict> llmVerdict) {
        StringBuilder text = new StringBuilder();
        if (blocked) {
            text.append("В тексте найдены запрещённые слова — мероприятие заблокировано и не отправлено администратору. "
                    + "Исправьте описание и сохраните снова. ");
        } else if (flagged) {
            text.append("Найдены возможные нарушения правил платформы. ");
            if (organizationEvent) {
                text.append("Допущенная организация публикует без премодерации — администратор получил сигнал. ");
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
}
