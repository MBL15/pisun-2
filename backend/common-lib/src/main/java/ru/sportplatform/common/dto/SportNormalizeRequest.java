package ru.sportplatform.common.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public record SportNormalizeRequest(
        @NotBlank @Size(max = 500) String query,
        List<String> knownNames
) {
    public SportNormalizeRequest {
        if (knownNames == null) {
            knownNames = List.of();
        }
    }
}
