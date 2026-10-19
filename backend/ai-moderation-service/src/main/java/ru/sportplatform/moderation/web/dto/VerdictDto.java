package ru.sportplatform.moderation.web.dto;

import java.time.Instant;
import java.util.List;

import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.AiStatus;

public record VerdictDto(
        Long id,
        Long eventId,
        String eventTitle,
        String organizerName,
        boolean organizationEvent,
        AiStatus status,
        AgeRestriction ageRestriction,
        String summary,
        List<String> reasons,
        String source,
        boolean hold,
        Instant createdAt
) {
}
