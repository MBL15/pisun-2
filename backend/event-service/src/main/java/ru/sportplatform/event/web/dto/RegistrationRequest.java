package ru.sportplatform.event.web.dto;

import jakarta.validation.constraints.Size;

/** childId — родитель записывает своего ребёнка; null — записывается сам. */
public record RegistrationRequest(
        Long childId,
        @Size(max = 500, message = "Сообщение организатору до 500 символов") String message
) {
}
