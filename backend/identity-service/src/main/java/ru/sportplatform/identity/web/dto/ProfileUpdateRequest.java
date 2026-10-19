package ru.sportplatform.identity.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProfileUpdateRequest(
        @NotBlank(message = "Укажите имя") @Size(max = 120) String displayName,
        @Size(max = 120) String city,
        @Size(max = 500) String interests,
        @Size(max = 1000) String bio
) {
}
