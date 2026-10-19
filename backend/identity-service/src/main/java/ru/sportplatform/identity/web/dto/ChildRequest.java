package ru.sportplatform.identity.web.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ChildRequest(
        @NotBlank(message = "Укажите имя ребёнка") @Size(max = 120) String displayName,
        @NotNull(message = "Укажите возраст") @Min(value = 3, message = "Возраст от 3 лет")
        @Max(value = 17, message = "Детский аккаунт — до 17 лет") Integer age,
        @Size(max = 500) String interests
) {
}
