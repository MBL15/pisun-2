package ru.sportplatform.identity.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OrganizationForm(
        @NotBlank(message = "Укажите название организации") @Size(max = 160) String name,
        @NotBlank(message = "Опишите деятельность организации") @Size(max = 3000) String description,
        @NotBlank(message = "Укажите спортивные направления") @Size(max = 500) String sportsInterests,
        @Size(max = 120) String city,
        @Size(max = 300) String address,
        @Size(max = 300) String contacts,
        @Size(max = 300) String website
) {
}
