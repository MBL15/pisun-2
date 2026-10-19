package ru.sportplatform.event.web.dto;

public record SportTypeDto(
        Long id,
        String name,
        String emoji,
        boolean custom,
        long eventsCount,
        String category,
        String icon,
        String tags,
        String defaultAge,
        String description,
        String equipment,
        String safetyNotes,
        Integer typicalDurationMinutes
) {
}
