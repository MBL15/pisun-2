package ru.sportplatform.identity.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.common.enums.RoleType;
import ru.sportplatform.common.policy.ReputationPolicy;
import ru.sportplatform.identity.domain.UserAccount;
import ru.sportplatform.identity.repository.UserAccountRepository;

@Service
@RequiredArgsConstructor
public class ReputationService {

    private final UserAccountRepository users;
    private final IdentityMapper mapper;

    @Transactional
    public UserDto penalizeForModeration(Long userId, String reason) {
        UserAccount user = users.findById(userId).orElse(null);
        if (user == null || !isOrganizerAccount(user.getRole())) {
            return null;
        }
        int next = ReputationPolicy.applyDelta(user.getReputation(), -ReputationPolicy.MODERATION_PENALTY);
        user.setReputation(next);
        return mapper.toDto(user);
    }

    @Transactional
    public UserDto applyDelta(Long userId, int delta, String reason) {
        UserAccount user = users.findById(userId).orElse(null);
        if (user == null || !isOrganizerAccount(user.getRole()) || delta == 0) {
            return null;
        }
        user.setReputation(ReputationPolicy.applyDelta(user.getReputation(), delta));
        return mapper.toDto(user);
    }

    private static boolean isOrganizerAccount(RoleType role) {
        return role == RoleType.USER || role == RoleType.ORGANIZATION;
    }
}
