package ru.sportplatform.event.web.dto;

public record MyRegistrationDto(
        RegistrationDto registration,
        EventDto event
) {
}
