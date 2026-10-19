package ru.sportplatform.event.service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.CommentSnapshotDto;
import ru.sportplatform.common.dto.CommentVerificationRequest;
import ru.sportplatform.common.dto.CommentVerificationResult;
import ru.sportplatform.common.dto.CommentVisibilityRequest;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.event.client.AiClient;
import ru.sportplatform.event.client.IdentityClient;
import ru.sportplatform.event.domain.EventComment;
import ru.sportplatform.event.domain.SportEvent;
import ru.sportplatform.event.repository.EventCommentRepository;
import ru.sportplatform.event.repository.SportEventRepository;
import ru.sportplatform.event.web.dto.CommentDto;
import ru.sportplatform.event.web.dto.CommentForm;

@Service
@RequiredArgsConstructor
public class CommentService {

    private static final String HIDDEN_PLACEHOLDER = "Сообщение скрыто модератором";

    private final EventCommentRepository comments;
    private final SportEventRepository events;
    private final EventService eventService;
    private final IdentityClient identity;
    private final AiClient ai;

    @Transactional(readOnly = true)
    public List<CommentDto> list(CurrentUser current, Long eventId) {
        SportEvent event = eventService.findVisible(current, eventId);
        return comments.findByEventIdOrderByCreatedAtAsc(eventId).stream()
                .map(c -> toDto(c, event.getTitle(), current))
                .toList();
    }

    @Transactional
    public CommentDto add(CurrentUser current, Long eventId, CommentForm form) {
        current.requireAuthenticated();
        SportEvent event = eventService.findVisible(current, eventId);
        boolean organizer = eventService.isOrganizer(event, current);
        if (event.getStatus() == EventStatus.UNPUBLISHED || event.getStatus() == EventStatus.DELETED) {
            throw ApiException.conflict("Обсуждение закрыто: мероприятие снято с публикации");
        }
        if (form.parentId() != null) {
            EventComment parent = comments.findById(form.parentId())
                    .orElseThrow(() -> ApiException.badRequest("Сообщение, на которое вы отвечаете, не найдено"));
            if (!parent.getEventId().equals(eventId)) {
                throw ApiException.badRequest("Ответ должен относиться к тому же мероприятию");
            }
        }
        UserDto author = identity.getUser(current.id());
        EventComment comment = EventComment.builder()
                .eventId(eventId)
                .parentId(form.parentId())
                .authorId(author.id())
                .authorName(organizer && author.organizationName() != null ? author.organizationName() : author.displayName())
                .authorRole(author.role())
                .authorAvatarColor(author.avatarColor())
                .organizerReply(organizer)
                .text(form.text().trim())
                .build();

        CommentVerificationResult check = ai.verifyComment(
                new CommentVerificationRequest(eventId, author.id(), author.displayName(), comment.getText()));
        if (check.autoHide()) {
            comment.setHidden(true);
            comment.setHiddenByAi(true);
            comment.setHiddenBy("ИИ-модератор");
            comment.setHiddenReason(check.reason());
        }
        return toDto(comments.save(comment), event.getTitle(), current);
    }

    @Transactional
    public void deleteOwn(CurrentUser current, Long commentId) {
        current.requireAuthenticated();
        EventComment comment = find(commentId);
        if (!current.id().equals(comment.getAuthorId())) {
            throw ApiException.forbidden("Удалить можно только своё сообщение");
        }
        comments.delete(comment);
    }

    /** Лента всех сообщений для администратора с фильтром «только скрытые» и поиском. */
    @Transactional(readOnly = true)
    public List<CommentDto> adminList(CurrentUser current, Boolean hidden, String query) {
        current.requireAdmin();
        List<EventComment> all = comments.findAllByOrderByCreatedAtDesc();
        Map<Long, String> titles = events.findAllById(all.stream().map(EventComment::getEventId).distinct().toList())
                .stream().collect(Collectors.toMap(SportEvent::getId, SportEvent::getTitle, (a, b) -> a));
        return all.stream()
                .filter(c -> hidden == null || c.isHidden() == hidden)
                .filter(c -> TextUtils.containsIgnoreCase(c.getText() + " " + c.getAuthorName() + " "
                        + titles.getOrDefault(c.getEventId(), ""), query))
                .map(c -> toDto(c, titles.get(c.getEventId()), current))
                .toList();
    }

    // ---------- внутренние операции модерации ----------

    @Transactional
    public CommentSnapshotDto setVisibility(Long id, CommentVisibilityRequest request) {
        EventComment comment = find(id);
        if (request.hidden() && TextUtils.isBlank(request.reason())) {
            throw ApiException.badRequest("Укажите причину скрытия сообщения");
        }
        comment.setHidden(request.hidden());
        comment.setHiddenByAi(false);
        comment.setHiddenReason(request.hidden() ? request.reason().trim() : null);
        comment.setHiddenBy(request.hidden() ? request.moderatorName() : null);
        return snapshot(comment);
    }

    @Transactional
    public CommentSnapshotDto deleteByModerator(Long id) {
        EventComment comment = find(id);
        CommentSnapshotDto snapshot = snapshot(comment);
        comments.delete(comment);
        return snapshot;
    }

    @Transactional(readOnly = true)
    public CommentSnapshotDto snapshot(Long id) {
        return snapshot(find(id));
    }

    private CommentSnapshotDto snapshot(EventComment c) {
        String title = events.findById(c.getEventId()).map(SportEvent::getTitle).orElse(null);
        return new CommentSnapshotDto(c.getId(), c.getEventId(), title, c.getAuthorId(), c.getAuthorName(),
                c.getText(), c.isHidden());
    }

    private EventComment find(Long id) {
        return comments.findById(id).orElseThrow(() -> ApiException.notFound("Сообщение #" + id + " не найдено"));
    }

    private static CommentDto toDto(EventComment c, String eventTitle, CurrentUser current) {
        boolean author = current.isAuthenticated() && current.id().equals(c.getAuthorId());
        boolean privileged = author || current.isAdmin();
        boolean showText = !c.isHidden() || privileged;
        return new CommentDto(
                c.getId(), c.getEventId(), eventTitle, c.getParentId(),
                c.getAuthorId(), c.getAuthorName(), c.getAuthorRole(), c.getAuthorAvatarColor(),
                c.isOrganizerReply(),
                showText ? c.getText() : null,
                c.isHidden(), c.isHiddenByAi(),
                c.isHidden() ? (privileged ? c.getHiddenReason() : HIDDEN_PLACEHOLDER) : null,
                c.getCreatedAt(),
                author
        );
    }
}
