package ru.sportplatform.identity.web.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import ru.sportplatform.common.dto.VerificationAttachmentDto;

public record VerificationRequestForm(
        @NotBlank @Size(max = 2000) String message,
        List<VerificationAttachmentDto> attachments
) {
}
