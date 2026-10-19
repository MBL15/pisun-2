package ru.sportplatform.identity.service;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.OrganizationDto;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.identity.domain.Organization;
import ru.sportplatform.identity.domain.UserAccount;
import ru.sportplatform.identity.repository.OrganizationRepository;
import ru.sportplatform.identity.repository.UserAccountRepository;

@Component
@RequiredArgsConstructor
public class IdentityMapper {

    private final UserAccountRepository users;
    private final OrganizationRepository organizations;

    public UserDto toDto(UserAccount user) {
        String parentName = user.getParentId() == null ? null
                : users.findById(user.getParentId()).map(UserAccount::getDisplayName).orElse(null);
        Organization org = user.getOrganizationId() == null ? null
                : organizations.findById(user.getOrganizationId()).orElse(null);
        return new UserDto(
                user.getId(),
                user.getDisplayName(),
                user.getEmail(),
                user.getRole(),
                user.getAge(),
                user.getCity(),
                user.getBio(),
                user.getInterests(),
                user.getAvatarColor(),
                user.getParentId(),
                parentName,
                org == null ? null : org.getId(),
                org == null ? null : org.getName(),
                org == null ? null : org.getStatus(),
                user.isDemo(),
                user.getDemoLabel()
        );
    }

    public OrganizationDto toDto(Organization org) {
        String ownerName = org.getOwnerUserId() == null ? null
                : users.findById(org.getOwnerUserId()).map(UserAccount::getDisplayName).orElse(null);
        return new OrganizationDto(
                org.getId(),
                org.getName(),
                org.getDescription(),
                org.getSportsInterests(),
                org.getCity(),
                org.getAddress(),
                org.getContacts(),
                org.getWebsite(),
                org.getLogoColor(),
                org.getStatus(),
                org.getRejectionReason(),
                org.getOwnerUserId(),
                ownerName,
                org.getCreatedAt(),
                org.getReviewedAt(),
                org.getReviewedBy()
        );
    }
}
