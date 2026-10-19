package ru.sportplatform.docs.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TemplateForm(
        @NotBlank(message = "Укажите название шаблона") @Size(max = 160) String name,
        @Size(max = 500) String description,
        @NotBlank(message = "Шаблон не может быть пустым") @Size(max = 100000, message = "Шаблон слишком большой") String content
) {
}
