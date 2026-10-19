package ru.sportplatform.moderation.web.dto;

import jakarta.validation.constraints.Size;

public record ImproveRequest(
        @Size(max = 160) String title,
        @Size(max = 4000) String description,
        @Size(max = 2000) String conditions,
        @Size(max = 80) String sportName,
        @Size(max = 300) String address
) {
}
