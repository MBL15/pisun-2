package ru.sportplatform.event.web.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ru.sportplatform.common.enums.ApplicationStatus;

public record DecisionRequest(
        @NotNull(message = "Выберите решение") ApplicationStatus status,
        @Size(max = 500) String comment
) {
}
