package ru.sportplatform.moderation.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.CommentVerificationRequest;
import ru.sportplatform.common.dto.CommentVerificationResult;
import ru.sportplatform.common.dto.EventVerificationRequest;
import ru.sportplatform.common.dto.EventVerificationResult;
import ru.sportplatform.common.dto.SportNormalizeRequest;
import ru.sportplatform.common.dto.SportNormalizeResult;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.moderation.service.AiAuditService;
import ru.sportplatform.moderation.service.AiVerificationService;
import ru.sportplatform.moderation.service.ModerationService;
import ru.sportplatform.moderation.service.SettingsService;
import ru.sportplatform.moderation.web.dto.AgentStatsDto;
import ru.sportplatform.moderation.web.dto.SettingsDto;
import ru.sportplatform.moderation.web.dto.SettingsForm;
import ru.sportplatform.moderation.web.dto.VerdictDto;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiVerificationService verificationService;
    private final AiAuditService auditService;
    private final SettingsService settingsService;
    private final ModerationService moderationService;

    /** Вызывается event-service при публикации; доступен и с фронтенда для предпросмотра вердикта. */
    @PostMapping("/verify-event")
    public EventVerificationResult verifyEvent(@Valid @RequestBody EventVerificationRequest request) {
        return verificationService.verifyEvent(request);
    }

    @PostMapping("/normalize-sport")
    public SportNormalizeResult normalizeSport(@Valid @RequestBody SportNormalizeRequest request) {
        return verificationService.normalizeSport(request);
    }

    @GetMapping("/agent-stats")
    public AgentStatsDto agentStats(CurrentUser user) {
        user.requireAdmin();
        return auditService.guardianStats24h();
    }

    @PostMapping("/verify-comment")
    public CommentVerificationResult verifyComment(@Valid @RequestBody CommentVerificationRequest request) {
        return verificationService.verifyComment(request);
    }

    @GetMapping("/verdicts")
    public List<VerdictDto> verdicts(CurrentUser user) {
        user.requireAdmin();
        return verificationService.recent();
    }

    @GetMapping("/settings")
    public SettingsDto settings(CurrentUser user) {
        user.requireAdmin();
        return settingsService.get();
    }

    @PutMapping("/settings")
    public SettingsDto updateSettings(CurrentUser user, @Valid @RequestBody SettingsForm form) {
        return moderationService.updateSettings(user, form);
    }
}
