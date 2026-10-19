package ru.sportplatform.event.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentForm(
        @NotBlank(message = "Напишите сообщение") @Size(max = 2000, message = "Сообщение до 2000 символов") String text,
        Long parentId
) {
}
