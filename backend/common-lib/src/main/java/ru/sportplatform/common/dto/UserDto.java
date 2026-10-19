package ru.sportplatform.common.dto;

import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.common.enums.Gender;
import ru.sportplatform.common.enums.RoleType;

/** Публичное представление аккаунта, которое identity-service отдаёт клиенту и другим сервисам. */
public record UserDto(
        Long id,
        String displayName,
        String email,
        RoleType role,
        Integer age,
        String city,
        String bio,
        String interests,
        String avatarColor,
        Gender gender,
        Long familyId,
        String spouseName,
        Long parentId,
        String parentName,
        Long organizationId,
        String organizationName,
        ApplicationStatus organizationStatus,
        boolean demo,
        String demoLabel
) {
    public boolean isApprovedOrganization() {
        return role == RoleType.ORGANIZATION && organizationStatus == ApplicationStatus.APPROVED;
    }
}
