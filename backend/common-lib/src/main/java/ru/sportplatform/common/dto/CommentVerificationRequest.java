package ru.sportplatform.common.dto;

import jakarta.validation.constraints.NotBlank;

public record CommentVerificationRequest(
        Long eventId,
        Long authorId,
        String authorName,
        @NotBlank String text
) {
}
