package ru.sportplatform.common.dto;

public record CommentVerificationResult(
        boolean flagged,
        boolean autoHide,
        String reason
) {
}
