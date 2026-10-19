package ru.sportplatform.common.dto;

/** Внутренний запрос ai-moderation-service → event-service. */
public record CommentVisibilityRequest(
        boolean hidden,
        String reason,
        String moderatorName
) {
}
