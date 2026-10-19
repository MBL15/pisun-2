package ru.sportplatform.moderation.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.CommentSnapshotDto;
import ru.sportplatform.common.dto.EventSnapshotDto;
import ru.sportplatform.common.dto.OrganizationDto;
import ru.sportplatform.common.dto.ReasonRequest;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.moderation.domain.ModerationAction;
import ru.sportplatform.moderation.service.ModerationService;

/** Все действия требуют X-User-Role: ADMIN. */
@RestController
@RequestMapping("/api/moderation")
@RequiredArgsConstructor
public class ModerationController {

    private final ModerationService moderation;

    @PostMapping("/organizations/{id}/approve")
    public OrganizationDto approveOrganization(CurrentUser user, @PathVariable Long id) {
        return moderation.approveOrganization(user, id);
    }

    @PostMapping("/organizations/{id}/reject")
    public OrganizationDto rejectOrganization(CurrentUser user, @PathVariable Long id,
                                              @Valid @RequestBody ReasonRequest request) {
        return moderation.rejectOrganization(user, id, request.reason());
    }

    @PostMapping("/events/{id}/unpublish")
    public EventSnapshotDto unpublish(CurrentUser user, @PathVariable Long id, @Valid @RequestBody ReasonRequest request) {
        return moderation.unpublishEvent(user, id, request.reason());
    }

    @PostMapping("/events/{id}/delete")
    public EventSnapshotDto delete(CurrentUser user, @PathVariable Long id, @Valid @RequestBody ReasonRequest request) {
        return moderation.deleteEvent(user, id, request.reason());
    }

    @PostMapping("/events/{id}/publish")
    public EventSnapshotDto publish(CurrentUser user, @PathVariable Long id) {
        return moderation.publishEvent(user, id);
    }

    @PostMapping("/comments/{id}/hide")
    public CommentSnapshotDto hideComment(CurrentUser user, @PathVariable Long id, @Valid @RequestBody ReasonRequest request) {
        return moderation.hideComment(user, id, request.reason());
    }

    @PostMapping("/comments/{id}/restore")
    public CommentSnapshotDto restoreComment(CurrentUser user, @PathVariable Long id) {
        return moderation.restoreComment(user, id);
    }

    @PostMapping("/comments/{id}/delete")
    public CommentSnapshotDto deleteComment(CurrentUser user, @PathVariable Long id, @Valid @RequestBody ReasonRequest request) {
        return moderation.deleteComment(user, id, request.reason());
    }

    @GetMapping("/journal")
    public List<ModerationAction> journal(CurrentUser user) {
        return moderation.journal(user);
    }
}
