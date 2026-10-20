package ru.sportplatform.identity.service;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.common.enums.FriendshipRelation;
import ru.sportplatform.common.enums.RoleType;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.identity.domain.FriendRequest;
import ru.sportplatform.identity.domain.UserAccount;
import ru.sportplatform.identity.repository.FriendRequestRepository;
import ru.sportplatform.identity.repository.UserAccountRepository;

@Service
@RequiredArgsConstructor
public class FriendshipService {

    private final FriendRequestRepository requests;
    private final UserAccountRepository users;
    private final IdentityMapper mapper;

    @Transactional(readOnly = true)
    public List<UserDto> friends(CurrentUser current) {
        current.requireAuthenticated();
        return friendIds(current.id()).stream()
                .map(users::findById)
                .flatMap(java.util.Optional::stream)
                .map(u -> mapper.toDto(u, FriendshipRelation.FRIENDS))
                .toList();
    }

    @Transactional(readOnly = true)
    public Set<Long> friendIds(Long userId) {
        if (userId == null) {
            return Set.of();
        }
        Set<Long> ids = new HashSet<>();
        for (FriendRequest fr : requests.findAcceptedForUser(userId, ApplicationStatus.APPROVED)) {
            ids.add(fr.getFromUserId().equals(userId) ? fr.getToUserId() : fr.getFromUserId());
        }
        return ids;
    }

    @Transactional(readOnly = true)
    public boolean areFriends(Long userA, Long userB) {
        if (userA == null || userB == null || userA.equals(userB)) {
            return false;
        }
        return relation(userA, userB) == FriendshipRelation.FRIENDS;
    }

    @Transactional(readOnly = true)
    public FriendshipRelation relation(Long viewerId, Long profileId) {
        if (viewerId == null || profileId == null || viewerId.equals(profileId)) {
            return FriendshipRelation.NONE;
        }
        FriendRequest direct = requests.findByFromUserIdAndToUserId(viewerId, profileId).orElse(null);
        if (direct != null) {
            return switch (direct.getStatus()) {
                case APPROVED -> FriendshipRelation.FRIENDS;
                case PENDING -> FriendshipRelation.OUTGOING;
                case REJECTED, CANCELLED -> FriendshipRelation.NONE;
            };
        }
        FriendRequest reverse = requests.findByFromUserIdAndToUserId(profileId, viewerId).orElse(null);
        if (reverse != null && reverse.getStatus() == ApplicationStatus.PENDING) {
            return FriendshipRelation.INCOMING;
        }
        if (reverse != null && reverse.getStatus() == ApplicationStatus.APPROVED) {
            return FriendshipRelation.FRIENDS;
        }
        return FriendshipRelation.NONE;
    }

    @Transactional(readOnly = true)
    public List<UserDto> search(CurrentUser current, String query) {
        current.requireAuthenticated();
        String q = query == null ? "" : query.trim();
        if (q.length() < 2) {
            throw ApiException.badRequest("Введите минимум 2 символа для поиска");
        }
        return users.findAll().stream()
                .filter(u -> u.getRole() == RoleType.USER || u.getRole() == RoleType.ORGANIZATION)
                .filter(u -> !u.getId().equals(current.id()))
                .filter(u -> TextUtils.containsIgnoreCase(u.getDisplayName() + " " + nullToEmpty(u.getInterests()), q))
                .limit(40)
                .map(u -> mapper.toDto(u, relation(current.id(), u.getId())).asPublicView())
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserDto> incoming(CurrentUser current) {
        current.requireAuthenticated();
        return requests.findByToUserIdAndStatusOrderByCreatedAtDesc(current.id(), ApplicationStatus.PENDING).stream()
                .map(fr -> users.findById(fr.getFromUserId()))
                .flatMap(java.util.Optional::stream)
                .map(u -> mapper.toDto(u, FriendshipRelation.INCOMING))
                .toList();
    }

    @Transactional
    public UserDto sendRequest(CurrentUser current, Long toUserId) {
        current.requireAuthenticated();
        if (current.id().equals(toUserId)) {
            throw ApiException.badRequest("Нельзя добавить себя в друзья");
        }
        UserAccount target = users.findById(toUserId)
                .orElseThrow(() -> ApiException.notFound("Пользователь не найден"));
        if (target.getRole() != RoleType.USER && target.getRole() != RoleType.ORGANIZATION) {
            throw ApiException.badRequest("Заявку можно отправить только взрослому пользователю или организации");
        }
        FriendshipRelation rel = relation(current.id(), toUserId);
        if (rel == FriendshipRelation.FRIENDS) {
            throw ApiException.conflict("Вы уже друзья");
        }
        if (rel == FriendshipRelation.OUTGOING) {
            throw ApiException.conflict("Заявка уже отправлена — дождитесь ответа");
        }
        if (rel == FriendshipRelation.INCOMING) {
            acceptByUsers(current.id(), toUserId);
            return mapper.toDto(target, FriendshipRelation.FRIENDS).asPublicView();
        }
        FriendRequest fr = FriendRequest.builder()
                .fromUserId(current.id())
                .toUserId(toUserId)
                .status(ApplicationStatus.PENDING)
                .build();
        requests.save(fr);
        return mapper.toDto(target, FriendshipRelation.OUTGOING).asPublicView();
    }

    @Transactional
    public UserDto accept(CurrentUser current, Long fromUserId) {
        current.requireAuthenticated();
        FriendRequest fr = requests.findByFromUserIdAndToUserId(fromUserId, current.id())
                .orElseThrow(() -> ApiException.notFound("Заявка не найдена"));
        if (fr.getStatus() != ApplicationStatus.PENDING) {
            throw ApiException.conflict("Эта заявка уже обработана");
        }
        fr.setStatus(ApplicationStatus.APPROVED);
        fr.setDecidedAt(Instant.now());
        UserAccount friend = users.findById(fromUserId).orElseThrow();
        return mapper.toDto(friend, FriendshipRelation.FRIENDS).asPublicView();
    }

    @Transactional
    public void reject(CurrentUser current, Long fromUserId) {
        current.requireAuthenticated();
        FriendRequest fr = requests.findByFromUserIdAndToUserId(fromUserId, current.id())
                .orElseThrow(() -> ApiException.notFound("Заявка не найдена"));
        if (fr.getStatus() != ApplicationStatus.PENDING) {
            throw ApiException.conflict("Эта заявка уже обработана");
        }
        fr.setStatus(ApplicationStatus.REJECTED);
        fr.setDecidedAt(Instant.now());
    }

    private void acceptByUsers(Long accepterId, Long requesterId) {
        FriendRequest fr = requests.findByFromUserIdAndToUserId(requesterId, accepterId)
                .orElseThrow(() -> ApiException.notFound("Заявка не найдена"));
        fr.setStatus(ApplicationStatus.APPROVED);
        fr.setDecidedAt(Instant.now());
    }

    private static String nullToEmpty(String v) {
        return v == null ? "" : v;
    }
}
