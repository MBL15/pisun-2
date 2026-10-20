package ru.sportplatform.identity.web.dto;

import jakarta.validation.constraints.NotNull;

public record AddSpouseRequest(
        @NotNull(message = "Выберите партнёра") Long spouseUserId
) {
}
