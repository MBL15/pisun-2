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
import ru.sportplatform.common.dto.AgentSuggestion;
import ru.sportplatform.common.dto.SportCurationRequest;
import ru.sportplatform.common.dto.SportCurationResult;
import ru.sportplatform.common.dto.CommentVerificationRequest;
import ru.sportplatform.common.dto.CommentVerificationResult;
import ru.sportplatform.common.dto.EventVerificationRequest;
import ru.sportplatform.common.dto.EventVerificationResult;
import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.AiStatus;
import ru.sportplatform.common.enums.Audience;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.moderation.ai.GuardianAdvisor;
import ru.sportplatform.moderation.ai.HeuristicAnalyzer;
import ru.sportplatform.moderation.ai.HeuristicAnalyzer.HeuristicResult;
import ru.sportplatform.moderation.ai.LlmClient;
import ru.sportplatform.moderation.ai.LlmClient.LlmVerdict;
import ru.sportplatform.moderation.domain.AiVerdict;
import ru.sportplatform.moderation.domain.ModerationSettings;
import ru.sportplatform.moderation.repository.AiVerdictRepository;
import ru.sportplatform.moderation.web.dto.ImproveRequest;
import ru.sportplatform.moderation.web.dto.ImproveResponse;
import ru.sportplatform.moderation.web.dto.VerdictDto;

@Service
@RequiredArgsConstructor
public class AiVerificationService {

    private final HeuristicAnalyzer heuristics;
    private final GuardianAdvisor advisor;
    private final LlmClient llm;
    private final SettingsService settingsService;
    private final AiVerdictRepository verdicts;
    private final AuditService audit;

    /**
     * Итоговый вердикт = эвристика ∪ LLM: нарушение засчитывается, если его нашёл хотя бы один анализатор,
     * а «безопасно для детей» — только если согласны оба.
     */
    @Transactional
    public EventVerificationResult verifyEvent(EventVerificationRequest request) {
        long started = System.currentTimeMillis();
        ModerationSettings settings = settingsService.current();
        if (!settings.isAiEnabled()) {
            AgeRestriction age = request.audience() == Audience.ADULTS ? AgeRestriction.ADULT_ONLY : AgeRestriction.CHILD_SAFE;
            EventVerificationResult disabled = new EventVerificationResult(null, AiStatus.AI_APPROVED, age,
                    "ИИ-проверка отключена администратором — событие опубликовано без автоматической проверки.",
                    List.of(), List.of(), "DISABLED", false, Instant.now(), List.of(),
                    advisor.ageExplanation(request, age, false));
            audit.record("GUARDIAN", request.draft() ? "VERIFY_DRAFT" : "VERIFY", request.title(),
                    "AI_APPROVED", "DISABLED", disabled.summary(), System.currentTimeMillis() - started);
            return request.draft() ? disabled : save(request, disabled);
        }

        HeuristicResult heuristic = heuristics.analyzeEvent(request.title(), request.description(), request.conditions(),
                request.audience(), request.startAt(), settings.getCustomStopWords());
        Optional<LlmVerdict> llmVerdict = settings.isLlmEnabled() ? llm.verify(request) : Optional.empty();

        boolean flagged = heuristic.isFlagged() || llmVerdict.map(LlmVerdict::flagged).orElse(false);
        // Взрослый маркер эвристики не снимается ответом LLM: «можно детям» только при согласии обоих.
        boolean adultOnly = heuristic.isAdultOnly() || flagged || llmVerdict.map(v -> !v.childSafe()).orElse(false);

        LinkedHashSet<String> reasons = new LinkedHashSet<>(heuristic.flagged());
        llmVerdict.ifPresent(v -> v.reasons().stream().filter(r -> !TextUtils.isBlank(r)).map(r -> "LLM: " + r).forEach(reasons::add));
        if (adultOnly) {
            reasons.addAll(heuristic.adultReasons());
        } else {
            reasons.addAll(heuristic.kidsReasons());
        }

        AgeRestriction age = adultOnly ? AgeRestriction.ADULT_ONLY : AgeRestriction.CHILD_SAFE;
        List<AgentSuggestion> suggestions = advisor.suggestions(request, age);
        suggestions.stream()
                .filter(s -> "SPORT_MISMATCH".equals(s.type()) || "CHILD_TRIGGER".equals(s.type()))
                .map(AgentSuggestion::message)
                .forEach(reasons::add);

        boolean hold = flagged && settings.isAutoHoldFlagged();
        String summary = summary(flagged, adultOnly, hold, request.organizationEvent(), heuristic, llmVerdict);
        if (suggestions.stream().anyMatch(s -> "SPORT_MISMATCH".equals(s.type()))) {
            summary = summary + " Проверьте вид спорта: описание говорит о другом направлении.";
        }
        String source = llmVerdict.isPresent() ? "MERGED" : "HEURISTIC";

        EventVerificationResult result = new EventVerificationResult(null,
                flagged ? AiStatus.FLAGGED : AiStatus.AI_APPROVED,
                age,
                summary.trim(),
                new ArrayList<>(reasons),
                heuristic.recommendations(),
                source,
                hold,
                Instant.now(),
                suggestions,
                advisor.ageExplanation(request, age, heuristic.isAdultOnly()));
        audit.record("GUARDIAN", request.draft() ? "VERIFY_DRAFT" : "VERIFY",
                request.title() + "\n" + request.description(),
                result.status().name(), source, result.summary(), System.currentTimeMillis() - started);
        return request.draft() ? result : save(request, result);
    }

    public SportCurationResult curateSport(SportCurationRequest request) {
        long started = System.currentTimeMillis();
        var llm = this.llm.curateSport(request.name(), request.description());
        SportCurationResult result = llm
                .map(v -> new SportCurationResult(v.adequate(), v.canonicalName(), v.category(), v.childSafe(), v.reason(), "LLM"))
                .orElseGet(() -> new SportCurationResult(true, request.name(), null, true,
                        "Модель недоступна — решение примет эвристика справочника.", "HEURISTIC"));
        audit.record("CURATOR", "CURATE", request.name(), result.adequate() ? "ADEQUATE" : "REJECTED",
                result.source(), result.reason(), System.currentTimeMillis() - started);
        return result;
    }

    /** Варианты описания. Никогда не записывает их в мероприятие. */
    public ImproveResponse improve(ImproveRequest request) {
        long started = System.currentTimeMillis();
        var llmVariants = llm.rewriteVariants(request.title(), request.description(), request.sportName());
        List<String> variants = llmVariants.orElseGet(() -> advisor.rewrites(
                request.title(), request.description(), request.conditions(), request.sportName(), request.address()));
        String source = llmVariants.isPresent() ? "LLM" : "HEURISTIC";
        audit.record("GUARDIAN", "IMPROVE", request.description(), "SUGGESTION", source,
                variants.isEmpty() ? "" : variants.get(0), System.currentTimeMillis() - started);
        return new ImproveResponse(variants, source);
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
                result.suggestions(), result.ageExplanation());
    }

    private static String summary(boolean flagged, boolean adultOnly, boolean hold, boolean organizationEvent,
                                  HeuristicResult heuristic, Optional<LlmVerdict> llmVerdict) {
        StringBuilder text = new StringBuilder();
        if (flagged) {
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
