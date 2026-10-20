package ru.sportplatform.identity.service;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.common.enums.FriendshipRelation;
import ru.sportplatform.common.enums.RoleType;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.policy.ReputationPolicy;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.identity.domain.Organization;
import ru.sportplatform.identity.domain.UserAccount;
import ru.sportplatform.identity.repository.OrganizationRepository;
import ru.sportplatform.identity.repository.UserAccountRepository;
import ru.sportplatform.identity.web.dto.ChildRequest;
import ru.sportplatform.identity.web.dto.ChildSettingsRequest;
import ru.sportplatform.identity.web.dto.OrganizationForm;
import ru.sportplatform.identity.web.dto.ProfileUpdateRequest;
import ru.sportplatform.identity.web.dto.RegisterRequest;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final String[] AVATAR_COLORS = {
            "#2563eb", "#16a34a", "#ea580c", "#9333ea", "#0891b2", "#dc2626", "#ca8a04", "#4f46e5"
    };

    private final UserAccountRepository users;
    private final OrganizationRepository organizations;
    private final IdentityMapper mapper;
    private final FriendshipService friendship;
    private final FamilyService familyService;

    @Transactional(readOnly = true)
    public List<UserDto> list(boolean demoOnly) {
        List<UserAccount> source = demoOnly ? users.findByDemoTrueOrderByDemoOrderAscIdAsc() : users.findAllByOrderByIdAsc();
        return source.stream().map(mapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public UserDto get(CurrentUser viewer, Long id) {
        UserAccount user = find(id);
        if (viewer.isAuthenticated() && viewer.id().equals(id)) {
            user.setLastActiveAt(Instant.now());
        }
        FriendshipRelation rel = viewer.isAuthenticated() ? friendship.relation(viewer.id(), id) : FriendshipRelation.NONE;
        UserDto dto = mapper.toDto(user, rel);
        if (!canSeePrivateProfile(viewer, user)) {
            return dto.asPublicView();
        }
        return dto;
    }

    /** Полный профиль для других сервисов (без маскировки). */
    @Transactional(readOnly = true)
    public UserDto getInternal(Long id) {
        return mapper.toDto(find(id));
    }

    @Transactional(readOnly = true)
    public List<UserDto> children(Long parentId) {
        UserAccount parent = find(parentId);
        if (parent.getFamilyId() != null) {
            return users.findByFamilyIdOrderByIdAsc(parent.getFamilyId()).stream()
                    .filter(u -> u.getRole() == RoleType.CHILD)
                    .map(mapper::toDto)
                    .toList();
        }
        return users.findByParentIdOrderByIdAsc(parentId).stream().map(mapper::toDto).toList();
    }

    @Transactional
    public UserDto register(RegisterRequest request) {
        if (request.role() != RoleType.USER && request.role() != RoleType.ORGANIZATION) {
            throw ApiException.badRequest("Самостоятельно можно зарегистрировать только пользователя или организацию");
        }
        if (!TextUtils.isBlank(request.email()) && users.findFirstByEmailIgnoreCase(request.email().trim()).isPresent()) {
            throw ApiException.conflict("Аккаунт с такой почтой уже есть — войдите через список аккаунтов");
        }
        if (request.role() == RoleType.ORGANIZATION && request.organization() == null) {
            throw ApiException.badRequest("Заполните сведения об организации для заявки на допуск");
        }

        UserAccount user = users.save(UserAccount.builder()
                .displayName(request.displayName().trim())
                .email(TextUtils.isBlank(request.email()) ? null : request.email().trim())
                .role(request.role())
                .age(request.age())
                .city(request.city())
                .interests(request.interests())
                .bio(request.bio())
                .avatarColor(pickColor(request.displayName()))
                .gender(request.role() == RoleType.USER ? request.gender() : null)
                .reputation(ReputationPolicy.DEFAULT_SCORE)
                .demo(false)
                .build());
        if (request.role() == RoleType.USER && request.gender() == null) {
            throw ApiException.badRequest("Укажите пол — он нужен для создания семьи");
        }

        if (request.role() == RoleType.ORGANIZATION) {
            Organization org = organizations.save(newOrganization(request.organization(), user.getId()));
            user.setOrganizationId(org.getId());
        }
        return mapper.toDto(user);
    }

    @Transactional
    public UserDto addChild(CurrentUser current, Long parentId, ChildRequest request) {
        current.requireAuthenticated();
        if (!parentId.equals(current.id())) {
            throw ApiException.forbidden("Добавить ребёнка может только сам родитель");
        }
        UserAccount parent = find(parentId);
        if (parent.getRole() != RoleType.USER) {
            throw ApiException.forbidden("Детский профиль можно привязать только к аккаунту взрослого пользователя");
        }
        familyService.ensureFamilyForParent(parent);
        UserAccount child = users.save(UserAccount.builder()
                .displayName(request.displayName().trim())
                .role(RoleType.CHILD)
                .age(request.age())
                .city(parent.getCity())
                .interests(request.interests())
                .parentId(parent.getId())
                .familyId(parent.getFamilyId())
                .avatarColor(pickColor(request.displayName()))
                .freeEventEntry(true)
                .demo(false)
                .build());
        return mapper.toDto(child);
    }

    @Transactional
    public UserDto updateChildSettings(CurrentUser current, Long childId, ChildSettingsRequest request) {
        current.requireAuthenticated();
        UserAccount child = find(childId);
        if (child.getRole() != RoleType.CHILD) {
            throw ApiException.badRequest("Настройки доступны только для детского аккаунта");
        }
        UserAccount me = find(current.id());
        if (!canManageChild(me, child)) {
            throw ApiException.forbidden("Можно настраивать только своих детей");
        }
        child.setFreeEventEntry(request.freeEventEntry());
        return mapper.toDto(child);
    }

    private boolean canManageChild(UserAccount adult, UserAccount child) {
        if (child.getParentId() != null && child.getParentId().equals(adult.getId())) {
            return true;
        }
        return FamilyService.sharesFamily(adult, child);
    }

    @Transactional
    public UserDto updateProfile(CurrentUser current, Long id, ProfileUpdateRequest request) {
        current.requireAuthenticated();
        UserAccount user = find(id);
        UserAccount me = find(current.id());
        boolean isParent = user.getParentId() != null && user.getParentId().equals(current.id());
        boolean familyGuardian = user.getRole() == RoleType.CHILD && FamilyService.sharesFamily(me, user);
        if (!id.equals(current.id()) && !isParent && !familyGuardian) {
            throw ApiException.forbidden("Можно редактировать только свой профиль или профиль своего ребёнка");
        }
        user.setDisplayName(request.displayName().trim());
        user.setCity(request.city());
        user.setInterests(request.interests());
        user.setBio(request.bio());
        if (id.equals(current.id()) && request.gender() != null && user.getRole() == RoleType.USER) {
            if (user.getFamilyId() != null && request.gender() != user.getGender()) {
                throw ApiException.conflict("Нельзя сменить пол, пока вы состоите в семье");
            }
            user.setGender(request.gender());
        }
        return mapper.toDto(user);
    }

    UserAccount find(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("Пользователь #" + id + " не найден"));
    }

    private boolean canSeePrivateProfile(CurrentUser viewer, UserAccount user) {
        if (!viewer.isAuthenticated()) {
            return false;
        }
        if (viewer.id().equals(user.getId()) || viewer.isAdmin()) {
            return true;
        }
        UserAccount me = users.findById(viewer.id()).orElse(null);
        if (me == null) {
            return false;
        }
        if (user.getParentId() != null && user.getParentId().equals(viewer.id())) {
            return true;
        }
        return me.getFamilyId() != null && me.getFamilyId().equals(user.getFamilyId());
    }

    static Organization newOrganization(OrganizationForm form, Long ownerId) {
        return Organization.builder()
                .name(form.name().trim())
                .description(form.description().trim())
                .sportsInterests(form.sportsInterests().trim())
                .city(form.city())
                .address(form.address())
                .contacts(form.contacts())
                .website(form.website())
                .logoColor(pickColor(form.name()))
                .status(ApplicationStatus.PENDING)
                .ownerUserId(ownerId)
                .build();
    }

    static String pickColor(String seed) {
        int hash = seed == null ? 0 : Math.abs(seed.hashCode());
        return AVATAR_COLORS[hash % AVATAR_COLORS.length];
    }
}
