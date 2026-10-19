package ru.sportplatform.common.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Тело запроса для действий, где причина обязательна (отклонение, снятие с публикации, скрытие). */
public record ReasonRequest(
        @NotBlank(message = "Укажите причину")
        @Size(max = 1000, message = "Причина не длиннее 1000 символов")
        String reason
) {
}
