package ru.sportplatform.identity.web.dto;

import jakarta.validation.constraints.NotNull;

public record ChildSettingsRequest(
        @NotNull(message = "Укажите настройку записи") Boolean freeEventEntry
) {
}
