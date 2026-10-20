package ru.sportplatform.identity.service;

import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.OrganizationDto;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.common.enums.FriendshipRelation;
import ru.sportplatform.common.enums.RoleType;
import ru.sportplatform.common.policy.ReputationPolicy;
import ru.sportplatform.identity.domain.Family;
import ru.sportplatform.identity.domain.Organization;
import ru.sportplatform.identity.domain.UserAccount;
import ru.sportplatform.identity.repository.FamilyRepository;
import ru.sportplatform.identity.repository.OrganizationRepository;
import ru.sportplatform.identity.repository.UserAccountRepository;

@Component
@RequiredArgsConstructor
public class IdentityMapper {

    private final UserAccountRepository users;
    private final OrganizationRepository organizations;
    private final FamilyRepository families;

    public UserDto toDto(UserAccount user) {
        return toDto(user, FriendshipRelation.NONE);
    }

    public UserDto toDto(UserAccount user, FriendshipRelation friendship) {
        String parentName = user.getParentId() == null ? null
                : users.findById(user.getParentId()).map(UserAccount::getDisplayName).orElse(null);
        String spouseName = spouseName(user);
        Organization org = user.getOrganizationId() == null ? null
                : organizations.findById(user.getOrganizationId()).orElse(null);
        int reputation = ReputationPolicy.display(user.getReputation());
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
                user.getGender(),
                user.getFamilyId(),
                spouseName,
                user.getParentId(),
                parentName,
                org == null ? null : org.getId(),
                org == null ? null : org.getName(),
                org == null ? null : org.getStatus(),
                user.isDemo(),
                user.getDemoLabel(),
                reputation,
                canCreateEvents(user.getRole(), reputation, org == null ? null : org.getStatus()),
                isVerified(user),
                friendship,
                user.isFreeEventEntry(),
                user.getLastActiveAt()
        );
    }

    private static boolean isVerified(UserAccount user) {
        if (user.getRole() == RoleType.ORGANIZATION) {
            return true;
        }
        return user.isVerified();
    }

    private static boolean canCreateEvents(RoleType role, int reputation,
                                           ru.sportplatform.common.enums.ApplicationStatus orgStatus) {
        if (!ReputationPolicy.canUserOrganize(reputation)) {
            return false;
        }
        return switch (role) {
            case USER -> true;
            case ORGANIZATION -> orgStatus == ru.sportplatform.common.enums.ApplicationStatus.APPROVED;
            default -> false;
        };
    }

    private String spouseName(UserAccount user) {
        if (user.getFamilyId() == null || user.getRole() != RoleType.USER) {
            return null;
        }
        return families.findById(user.getFamilyId())
                .map(f -> partnerName(f, user.getId()))
                .orElse(null);
    }

    private String partnerName(Family family, Long userId) {
        Long partnerId = userId.equals(family.getMaleUserId()) ? family.getFemaleUserId() : family.getMaleUserId();
        if (partnerId == null) {
            return null;
        }
        return users.findById(partnerId).map(UserAccount::getDisplayName).orElse(null);
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
