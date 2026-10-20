package ru.sportplatform.common.dto;

import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.common.enums.FriendshipRelation;
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
        String demoLabel,
        int reputation,
        boolean canCreateEvents,
        /** Галочка доверия: публикация без придержки ИИ (у организаций всегда true). */
        boolean verified,
        /** Связь с текущим зрителем; для списка поиска и чужого профиля. */
        FriendshipRelation friendship
) {
    public boolean isApprovedOrganization() {
        return role == RoleType.ORGANIZATION && organizationStatus == ApplicationStatus.APPROVED;
    }

    /** Публичная карточка: без почты и семейных связей. */
    public UserDto asPublicView() {
        return new UserDto(
                id,
                displayName,
                null,
                role,
                age,
                city,
                bio,
                interests,
                avatarColor,
                gender,
                null,
                null,
                null,
                null,
                organizationId,
                organizationName,
                organizationStatus,
                demo,
                demoLabel,
                reputation,
                canCreateEvents,
                verified,
                friendship
        );
    }
}
