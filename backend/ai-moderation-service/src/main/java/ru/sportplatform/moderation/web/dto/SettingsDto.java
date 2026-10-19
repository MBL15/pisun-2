package ru.sportplatform.moderation.web.dto;

import java.time.Instant;

public record SettingsDto(
        boolean aiEnabled,
        boolean autoHoldFlagged,
        boolean llmEnabled,
        boolean commentFilterEnabled,
        String customStopWords,
        boolean llmConfigured,
        String llmModel,
        Instant updatedAt,
        String updatedBy
) {
}
