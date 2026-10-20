package ru.sportplatform.common.dto;

/**
 * Единый формат подсказок агентов Event Quality Guardian и Sport Type Curator.
 */
public record AgentSuggestion(
        String type,
        String field,
        String message,
        double confidence,
        boolean autoApplicable
) {
}
