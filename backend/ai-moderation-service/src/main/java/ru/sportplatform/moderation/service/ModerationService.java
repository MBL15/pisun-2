package ru.sportplatform.moderation.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ru.sportplatform.common.dto.CommentSnapshotDto;
import ru.sportplatform.common.dto.CommentVisibilityRequest;
import ru.sportplatform.common.dto.EventSnapshotDto;
import ru.sportplatform.common.dto.EventStatusChangeRequest;
import ru.sportplatform.common.dto.OrganizationDecisionRequest;
import ru.sportplatform.common.dto.OrganizationDto;
import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.moderation.client.PlatformClients;
import ru.sportplatform.moderation.domain.ModerationAction;
import ru.sportplatform.moderation.domain.ModerationAction.Type;
import ru.sportplatform.moderation.repository.ModerationActionRepository;
import ru.sportplatform.moderation.web.dto.SettingsDto;
import ru.sportplatform.moderation.web.dto.SettingsForm;
/** Ручной контур администратора: каждое решение меняет данные в профильном сервисе и попадает в журнал. */
@Slf4j
@Service
@RequiredArgsConstructor
public class ModerationService {

    private final PlatformClients platform;
    private final ModerationActionRepository actions;
    private final SettingsService settings;

    // ----- организации -----

    @Transactional
    public OrganizationDto approveOrganization(CurrentUser current, Long id) {
        String admin = adminName(current);
        OrganizationDto org = platform.decideOrganization(id, new OrganizationDecisionRequest(true, null, admin));
        log(current, admin, Type.ORGANIZATION_APPROVED, "ORGANIZATION", id, org.name(), null);
        return org;
    }

    @Transactional
    public OrganizationDto rejectOrganization(CurrentUser current, Long id, String reason) {
        String admin = adminName(current);
        OrganizationDto org = platform.decideOrganization(id, new OrganizationDecisionRequest(false, reason, admin));
        log(current, admin, Type.ORGANIZATION_REJECTED, "ORGANIZATION", id, org.name(), reason);
        return org;
    }

    // ----- мероприятия -----

    @Transactional
    public EventSnapshotDto unpublishEvent(CurrentUser current, Long id, String reason) {
        return changeEvent(current, id, EventStatus.UNPUBLISHED, reason, Type.EVENT_UNPUBLISHED);
    }

    @Transactional
    public EventSnapshotDto deleteEvent(CurrentUser current, Long id, String reason) {
        return changeEvent(current, id, EventStatus.DELETED, reason, Type.EVENT_DELETED);
    }

    /** Восстановление снятого события или одобрение события, придержанного ИИ. */
    @Transactional
    public EventSnapshotDto publishEvent(CurrentUser current, Long id) {
        return changeEvent(current, id, EventStatus.PUBLISHED, null, Type.EVENT_PUBLISHED);
    }

    private EventSnapshotDto changeEvent(CurrentUser current, Long id, EventStatus status, String reason, Type type) {
        String admin = adminName(current);
        EventSnapshotDto event = platform.changeEventStatus(id, new EventStatusChangeRequest(status, reason, admin));
        log(current, admin, type, "EVENT", id, event.title(), reason);
        if (type == Type.EVENT_UNPUBLISHED || type == Type.EVENT_DELETED) {
            try {
                platform.penalizeOrganizerReputation(event, reason);
            } catch (Exception e) {
                log.warn("Cannot apply reputation penalty for user {}: {}", event.organizerUserId(), e.getMessage());
            }
        }
        return event;
    }

    // ----- обсуждения -----

    @Transactional
    public CommentSnapshotDto hideComment(CurrentUser current, Long id, String reason) {
        String admin = adminName(current);
        CommentSnapshotDto comment = platform.setCommentVisibility(id, new CommentVisibilityRequest(true, reason, admin));
        log(current, admin, Type.COMMENT_HIDDEN, "COMMENT", id, commentTitle(comment), reason);
        return comment;
    }

    @Transactional
    public CommentSnapshotDto restoreComment(CurrentUser current, Long id) {
        String admin = adminName(current);
        CommentSnapshotDto comment = platform.setCommentVisibility(id, new CommentVisibilityRequest(false, null, admin));
        log(current, admin, Type.COMMENT_RESTORED, "COMMENT", id, commentTitle(comment), null);
        return comment;
    }

    @Transactional
    public CommentSnapshotDto deleteComment(CurrentUser current, Long id, String reason) {
        String admin = adminName(current);
        CommentSnapshotDto comment = platform.deleteComment(id);
        log(current, admin, Type.COMMENT_DELETED, "COMMENT", id, commentTitle(comment), reason);
        return comment;
    }

    // ----- настройки ИИ и журнал -----

    @Transactional
    public SettingsDto updateSettings(CurrentUser current, SettingsForm form) {
        String admin = adminName(current);
        SettingsDto updated = settings.update(form, admin);
        log(current, admin, Type.SETTINGS_CHANGED, "AI_SETTINGS", null,
                "ИИ: " + (form.aiEnabled() ? "вкл" : "выкл") + ", придержка: " + (form.autoHoldFlagged() ? "вкл" : "выкл")
                        + ", фильтр обсуждений: " + (form.commentFilterEnabled() ? "вкл" : "выкл"), null);
        return updated;
    }

    @Transactional(readOnly = true)
    public List<ModerationAction> journal(CurrentUser current) {
        current.requireAdmin();
        return actions.findTop200ByOrderByCreatedAtDesc();
    }

    private String adminName(CurrentUser current) {
        current.requireAdmin();
        try {
            return platform.user(current.id()).displayName();
        } catch (Exception e) {
            log.warn("Cannot resolve admin name: {}", e.getMessage());
            return "Администратор #" + current.id();
        }
    }

    private void log(CurrentUser current, String admin, Type type, String targetType, Long targetId, String title,
                     String reason) {
        actions.save(ModerationAction.builder()
                .type(type)
                .targetType(targetType)
                .targetId(targetId)
                .targetTitle(title)
                .reason(reason)
                .adminId(current.id())
                .adminName(admin)
                .build());
    }

    private static String commentTitle(CommentSnapshotDto comment) {
        String text = comment.text() == null ? "" : comment.text();
        String preview = text.length() > 80 ? text.substring(0, 80) + "…" : text;
        return comment.authorName() + " в «" + comment.eventTitle() + "»: " + preview;
    }
}
