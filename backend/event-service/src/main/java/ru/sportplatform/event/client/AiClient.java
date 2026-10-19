package ru.sportplatform.event.client;

import java.time.Instant;
import java.util.List;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import lombok.extern.slf4j.Slf4j;
import ru.sportplatform.common.dto.AiAuditRequest;
import ru.sportplatform.common.dto.CommentVerificationRequest;
import ru.sportplatform.common.dto.CommentVerificationResult;
import ru.sportplatform.common.dto.EventVerificationRequest;
import ru.sportplatform.common.dto.EventVerificationResult;
import ru.sportplatform.common.dto.SportCurationRequest;
import ru.sportplatform.common.dto.SportCurationResult;
import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.AiStatus;
import ru.sportplatform.common.enums.Audience;

/** Если ai-moderation-service недоступен, публикация не блокируется — событие получает пометку об отложенной проверке. */
@Slf4j
@Component
public class AiClient {

    private final RestClient client;

    public AiClient(@Qualifier("aiRestClient") RestClient client) {
        this.client = client;
    }

    public EventVerificationResult verifyEvent(EventVerificationRequest request) {
        try {
            EventVerificationResult result = client.post().uri("/api/ai/verify-event")
                    .body(request).retrieve().body(EventVerificationResult.class);
            if (result != null) {
                return result;
            }
        } catch (Exception e) {
            log.warn("AI moderation unavailable, using fallback verdict: {}", e.getMessage());
        }
        AgeRestriction age = request.audience() == Audience.ADULTS ? AgeRestriction.ADULT_ONLY : AgeRestriction.CHILD_SAFE;
        return new EventVerificationResult(null, AiStatus.AI_APPROVED, age,
                "ИИ-модератор временно недоступен: событие опубликовано, администратор может проверить его вручную.",
                List.of(), List.of(), "FALLBACK", false, Instant.now(), List.of(), null);
    }

    public SportCurationResult curateSport(SportCurationRequest request) {
        try {
            return client.post().uri("/api/ai/curate-sport").body(request).retrieve().body(SportCurationResult.class);
        } catch (Exception e) {
            log.warn("Sport curation unavailable: {}", e.getMessage());
            return null;
        }
    }

    public void audit(String agent, String action, String verdict, String source, String detail) {
        try {
            client.post().uri("/api/ai/audit")
                    .body(new AiAuditRequest(agent, action, verdict, source, detail, 0L))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("AI audit log unavailable: {}", e.getMessage());
        }
    }

    public CommentVerificationResult verifyComment(CommentVerificationRequest request) {
        try {
            CommentVerificationResult result = client.post().uri("/api/ai/verify-comment")
                    .body(request).retrieve().body(CommentVerificationResult.class);
            if (result != null) {
                return result;
            }
        } catch (Exception e) {
            log.warn("AI comment check unavailable: {}", e.getMessage());
        }
        return new CommentVerificationResult(false, false, null);
    }
}
