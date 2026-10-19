package ru.sportplatform.common.dto;

/**
 * Подсказка агента. Фронтенд рисует их одним компонентом и никогда не применяет сам,
 * даже если {@code autoApplicable} — это только пометка «можно принять одним кликом».
 */
public record AgentSuggestion(
        String type,
        String field,
        String message,
        double confidence,
        boolean autoApplicable
) {
}
