package ru.sportplatform.common.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;
import ru.sportplatform.common.enums.Audience;

/**
 * Запрос проверки мероприятия.
 *
 * @param mode {@code DRAFT} — подсказки по мере ввода, вердикт в ленту не пишется;
 *             {@code PUBLISHED} или пусто — проверка при сохранении.
 */
public record EventVerificationRequest(
        Long eventId,
        @NotBlank String title,
        String description,
        String conditions,
        String sportName,
        Audience audience,
        LocalDateTime startAt,
        String organizerName,
        boolean organizationEvent,
        String mode
) {
    public boolean draft() {
        return "DRAFT".equalsIgnoreCase(mode);
    }
}
