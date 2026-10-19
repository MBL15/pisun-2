package ru.sportplatform.common.dto;

import ru.sportplatform.common.enums.EventStatus;

/** Внутренний запрос ai-moderation-service → event-service. */
public record EventStatusChangeRequest(
        EventStatus status,
        String reason,
        String moderatorName
) {
}
