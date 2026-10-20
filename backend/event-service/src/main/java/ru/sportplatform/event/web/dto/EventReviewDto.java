package ru.sportplatform.event.web.dto;

import java.time.Instant;

public record EventReviewDto(
        Long id,
        Long eventId,
        Long authorId,
        String authorName,
        String authorAvatarColor,
        int stars,
        String comment,
        Instant createdAt,
        Instant updatedAt,
        boolean mine
) {
}
