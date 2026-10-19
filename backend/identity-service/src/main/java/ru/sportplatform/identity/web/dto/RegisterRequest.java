package ru.sportplatform.identity.web.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ru.sportplatform.common.enums.Gender;
import ru.sportplatform.common.enums.RoleType;

/** Имитация регистрации: создаёт новый аккаунт без пароля и подтверждения почты. */
public record RegisterRequest(
        @NotBlank(message = "Укажите имя") @Size(max = 120) String displayName,
        @Email(message = "Неверный формат почты") @Size(max = 160) String email,
        @Min(value = 14, message = "Самостоятельная регистрация — с 14 лет; детей добавляет родитель")
        @Max(value = 120) Integer age,
        @Size(max = 120) String city,
        @Size(max = 500) String interests,
        @Size(max = 1000) String bio,
        @NotNull(message = "Выберите тип аккаунта") RoleType role,
        Gender gender,
        @Valid OrganizationForm organization
) {
}
