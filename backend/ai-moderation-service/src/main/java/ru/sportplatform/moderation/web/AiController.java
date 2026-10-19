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
import ru.sportplatform.common.dto.AiAuditRequest;
import ru.sportplatform.common.dto.SportCurationRequest;
import ru.sportplatform.common.dto.SportCurationResult;
import ru.sportplatform.common.dto.CommentVerificationRequest;
import ru.sportplatform.common.dto.CommentVerificationResult;
import ru.sportplatform.common.dto.EventVerificationRequest;
import ru.sportplatform.common.dto.EventVerificationResult;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.moderation.service.AiVerificationService;
import ru.sportplatform.moderation.service.AuditService;
import ru.sportplatform.moderation.service.GuardianReportService;
import ru.sportplatform.moderation.service.ModerationService;
import ru.sportplatform.moderation.service.SettingsService;
import ru.sportplatform.moderation.web.dto.GuardianReportDto;
import ru.sportplatform.moderation.web.dto.ImproveRequest;
import ru.sportplatform.moderation.web.dto.ImproveResponse;
import ru.sportplatform.moderation.web.dto.SettingsDto;
import ru.sportplatform.moderation.web.dto.SettingsForm;
import ru.sportplatform.moderation.web.dto.VerdictDto;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final AiVerificationService verificationService;
    private final SettingsService settingsService;
    private final ModerationService moderationService;
    private final GuardianReportService guardianReport;
    private final AuditService auditService;

    /** Вызывается event-service при публикации; доступен и с фронтенда для предпросмотра вердикта. */
    @PostMapping("/verify-event")
    public EventVerificationResult verifyEvent(@Valid @RequestBody EventVerificationRequest request) {
        return verificationService.verifyEvent(request);
    }

    @PostMapping("/verify-comment")
    public CommentVerificationResult verifyComment(@Valid @RequestBody CommentVerificationRequest request) {
        return verificationService.verifyComment(request);
    }

    /** Черновики описания. Ответ только предлагается, мероприятие само не меняется. */
    @PostMapping("/improve-event")
    public ImproveResponse improve(@Valid @RequestBody ImproveRequest request) {
        return verificationService.improve(request);
    }

    @PostMapping("/curate-sport")
    public SportCurationResult curateSport(@RequestBody SportCurationRequest request) {
        return verificationService.curateSport(request);
    }

    @GetMapping("/guardian/report")
    public GuardianReportDto guardianReport(CurrentUser user) {
        return guardianReport.daily(user);
    }

    /** Внутренний журнал: event-service пишет сюда решения куратора и автоснятия. */
    @PostMapping("/audit")
    public void audit(@RequestBody AiAuditRequest request) {
        auditService.record(request);
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
