package ru.sportplatform.event.web.dto;

public record SportSuggestItem(
        Long id,
        String name,
        String emoji,
        double score
) {
}
