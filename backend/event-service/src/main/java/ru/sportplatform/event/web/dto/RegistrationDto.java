package ru.sportplatform.event.web.dto;

import java.time.Instant;

import ru.sportplatform.common.enums.ApplicationStatus;

public record RegistrationDto(
        Long id,
        Long eventId,
        Long participantId,
        String participantName,
        boolean child,
        Integer participantAge,
        Long registeredById,
        String registeredByName,
        ApplicationStatus status,
        String message,
        String decisionComment,
        Instant createdAt,
        Instant decidedAt
) {
}
