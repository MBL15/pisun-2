package ru.sportplatform.event.web.dto;

public record SportTypeDto(
        Long id,
        String name,
        String emoji,
        boolean custom,
        long eventsCount
) {
}
