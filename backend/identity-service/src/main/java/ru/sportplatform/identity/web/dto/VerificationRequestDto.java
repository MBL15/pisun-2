package ru.sportplatform.identity.web.dto;

import java.time.Instant;
import java.util.List;

import ru.sportplatform.common.dto.VerificationAttachmentDto;
import ru.sportplatform.common.enums.VerificationRequestStatus;

public record VerificationRequestDto(
        Long id,
        Long userId,
        String userDisplayName,
        String message,
        List<VerificationAttachmentDto> attachments,
        VerificationRequestStatus status,
        String rejectionReason,
        String reviewedBy,
        Instant createdAt,
        Instant reviewedAt
) {
}
