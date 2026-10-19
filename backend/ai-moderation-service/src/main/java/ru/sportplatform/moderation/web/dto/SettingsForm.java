package ru.sportplatform.moderation.web.dto;

import jakarta.validation.constraints.Size;

public record SettingsForm(
        boolean aiEnabled,
        boolean autoHoldFlagged,
        boolean llmEnabled,
        boolean commentFilterEnabled,
        @Size(max = 2000, message = "Список стоп-слов до 2000 символов") String customStopWords
) {
}
