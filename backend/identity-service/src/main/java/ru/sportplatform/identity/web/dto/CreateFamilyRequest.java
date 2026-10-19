package ru.sportplatform.identity.web.dto;

import jakarta.validation.constraints.NotNull;

public record CreateFamilyRequest(
        @NotNull(message = "Выберите партнёра для семьи") Long spouseUserId
) {
}
