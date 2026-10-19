package ru.sportplatform.common.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;
import ru.sportplatform.common.enums.Audience;

/** Запрос event-service → ai-moderation-service при публикации мероприятия. */
public record EventVerificationRequest(
        Long eventId,
        @NotBlank String title,
        String description,
        String conditions,
        String sportName,
        Audience audience,
        LocalDateTime startAt,
        String organizerName,
        boolean organizationEvent
) {
}
