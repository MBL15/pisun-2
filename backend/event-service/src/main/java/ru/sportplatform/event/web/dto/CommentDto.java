package ru.sportplatform.event.web.dto;

import java.time.Instant;

import ru.sportplatform.common.enums.RoleType;

/** text == null — сообщение скрыто модератором и зрителю недоступно. */
public record CommentDto(
        Long id,
        Long eventId,
        String eventTitle,
        Long parentId,
        Long authorId,
        String authorName,
        RoleType authorRole,
        String authorAvatarColor,
        boolean organizerReply,
        String text,
        boolean hidden,
        boolean hiddenByAi,
        String hiddenReason,
        Instant createdAt,
        boolean canDelete
) {
}
