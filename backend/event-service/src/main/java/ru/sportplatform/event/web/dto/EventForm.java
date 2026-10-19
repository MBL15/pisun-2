package ru.sportplatform.event.web.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ru.sportplatform.common.enums.Audience;
import ru.sportplatform.common.enums.RegistrationMode;
import ru.sportplatform.event.domain.SkillLevel;

/**
 * Форма создания/редактирования. Направление — либо sportTypeId из справочника,
 * либо customSportName (новое направление добавится в справочник автоматически).
 */
public record EventForm(
        @NotBlank(message = "Укажите название") @Size(max = 160, message = "Название до 160 символов") String title,
        @NotBlank(message = "Добавьте описание") @Size(max = 4000) String description,
        Long sportTypeId,
        @Size(max = 80, message = "Название направления до 80 символов") String customSportName,
        @NotNull(message = "Укажите дату и время") LocalDateTime startAt,
        @NotNull(message = "Укажите длительность") @Min(value = 15, message = "Длительность от 15 минут")
        @Max(value = 1440, message = "Длительность не больше суток") Integer durationMinutes,
        @NotBlank(message = "Укажите место проведения") @Size(max = 300) String address,
        @Size(max = 500) String locationNote,
        @DecimalMin("-90") @DecimalMax("90") Double latitude,
        @DecimalMin("-180") @DecimalMax("180") Double longitude,
        @Size(max = 2000) String conditions,
        SkillLevel level,
        Audience audience,
        @Min(value = 2, message = "Мест должно быть хотя бы 2") @Max(10000) Integer capacity,
        @NotNull(message = "Выберите режим записи") RegistrationMode registrationMode,
        @Size(max = 1000) String organizerContact
) {
}
