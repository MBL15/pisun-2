package ru.sportplatform.common.dto;

import java.time.Instant;

import ru.sportplatform.common.enums.ApplicationStatus;

public record OrganizationDto(
        Long id,
        String name,
        String description,
        String sportsInterests,
        String city,
        String address,
        String contacts,
        String website,
        String logoColor,
        ApplicationStatus status,
        String rejectionReason,
        Long ownerUserId,
        String ownerName,
        Instant createdAt,
        Instant reviewedAt,
        String reviewedBy
) {
}
