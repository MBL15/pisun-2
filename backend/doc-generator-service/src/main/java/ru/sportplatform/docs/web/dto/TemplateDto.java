package ru.sportplatform.docs.web.dto;

import java.time.Instant;

public record TemplateDto(
        Long id,
        String code,
        String name,
        String description,
        String content,
        String updatedBy,
        Instant updatedAt
) {
}
