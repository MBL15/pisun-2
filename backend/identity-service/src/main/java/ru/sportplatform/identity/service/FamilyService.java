package ru.sportplatform.identity.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.FamilyDto;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.common.enums.Gender;
import ru.sportplatform.common.enums.RoleType;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.identity.domain.Family;
import ru.sportplatform.identity.domain.UserAccount;
import ru.sportplatform.identity.repository.FamilyRepository;
import ru.sportplatform.identity.repository.UserAccountRepository;

@Service
@RequiredArgsConstructor
public class FamilyService {

    private final FamilyRepository families;
    private final UserAccountRepository users;
    private final IdentityMapper mapper;

    @Transactional(readOnly = true)
    public FamilyDto mine(CurrentUser current) {
        current.requireAuthenticated();
        UserAccount me = find(current.id());
        if (me.getFamilyId() == null) {
            throw ApiException.notFound("Вы ещё не создали семью");
        }
        return toDto(findFamily(me.getFamilyId()), me);
    }

    @Transactional(readOnly = true)
    public List<UserDto> eligibleSpouses(CurrentUser current) {
        current.requireAuthenticated();
        UserAccount me = find(current.id());
        requireAdultUser(me);
        if (me.getGender() == null) {
            throw ApiException.badRequest("Укажите пол в профиле — без этого нельзя создать семью");
        }
        if (me.getFamilyId() != null) {
            Family family = findFamily(me.getFamilyId());
            if (partnerSlotFilled(family, me) || family.getPendingSpouseUserId() != null) {
                return List.of();
            }
        }
        java.util.Set<Long> invitedElsewhere = new java.util.HashSet<>();
        for (Family f : families.findAllByPendingSpouseUserIdIsNotNull()) {
            invitedElsewhere.add(f.getPendingSpouseUserId());
        }
        Gender opposite = opposite(me.getGender());
        return users.findAllByOrderByIdAsc().stream()
                .filter(u -> u.getRole() == RoleType.USER)
                .filter(u -> u.getFamilyId() == null)
                .filter(u -> u.getGender() == opposite)
                .filter(u -> !u.getId().equals(me.getId()))
                .filter(u -> !invitedElsewhere.contains(u.getId()))
                .map(mapper::toDto)
                .toList();
    }

    @Transactional
    public FamilyDto create(CurrentUser current, Long spouseUserId) {
        current.requireAuthenticated();
        UserAccount me = find(current.id());
        requireAdultUser(me);
        if (me.getGender() == null) {
            throw ApiException.badRequest("Укажите пол в профиле — без этого нельзя создать семью");
        }
        if (me.getFamilyId() != null) {
            throw ApiException.conflict("Вы уже состоите в семье");
        }
        Family family = families.save(singleParentFamily(me));
        me.setFamilyId(family.getId());
        attachLooseChildren(me, family.getId());
        if (spouseUserId != null) {
            family.setPendingSpouseUserId(checkSpouseCandidate(me, spouseUserId).getId());
        }
        return toDto(family, me);
    }

    /** Приглашение второго родителя: семейный статус партнёра меняется только после его согласия. */
    @Transactional
    public FamilyDto addSpouse(CurrentUser current, Long spouseUserId) {
        current.requireAuthenticated();
        UserAccount me = find(current.id());
        requireAdultUser(me);
        if (me.getFamilyId() == null) {
            throw ApiException.badRequest("Сначала создайте семью");
        }
        Family family = findFamily(me.getFamilyId());
        if (partnerSlotFilled(family, me)) {
            throw ApiException.conflict("В семье уже есть второй родитель");
        }
        if (family.getPendingSpouseUserId() != null) {
            throw ApiException.conflict("Приглашение уже отправлено — дождитесь ответа или отмените его");
        }
        family.setPendingSpouseUserId(checkSpouseCandidate(me, spouseUserId).getId());
        return toDto(family, me);
    }

    /** Семьи, куда текущий пользователь приглашён вторым родителем. */
    @Transactional(readOnly = true)
    public List<FamilyDto> invitations(CurrentUser current) {
        current.requireAuthenticated();
        return families.findAllByPendingSpouseUserId(current.id()).stream()
                .map(f -> toDto(f, find(current.id())))
                .toList();
    }

    @Transactional
    public FamilyDto acceptInvitation(CurrentUser current, Long familyId) {
        current.requireAuthenticated();
        UserAccount me = find(current.id());
        requireAdultUser(me);
        Family family = findFamily(familyId);
        if (!me.getId().equals(family.getPendingSpouseUserId())) {
            throw ApiException.notFound("Приглашение в эту семью не найдено");
        }
        if (me.getFamilyId() != null && !me.getFamilyId().equals(familyId)) {
            throw ApiException.conflict("Вы уже состоите в другой семье");
        }
        if (me.getGender() == null) {
            throw ApiException.badRequest("Укажите пол в профиле — без этого нельзя вступить в семью");
        }
        boolean maleSlotFree = family.getMaleUserId() == null;
        boolean femaleSlotFree = family.getFemaleUserId() == null;
        if (me.getGender() == Gender.MALE && !maleSlotFree) {
            throw ApiException.conflict("Место второго родителя в этой семье уже занято");
        }
        if (me.getGender() == Gender.FEMALE && !femaleSlotFree) {
            throw ApiException.conflict("Место второго родителя в этой семье уже занято");
        }
        if (me.getGender() == Gender.MALE) {
            family.setMaleUserId(me.getId());
        } else {
            family.setFemaleUserId(me.getId());
        }
        family.setPendingSpouseUserId(null);
        me.setFamilyId(family.getId());
        attachLooseChildren(me, family.getId());
        return toDto(family, me);
    }

    /** Отклонить приглашение может приглашённый; отозвать — член семьи, отправивший его. */
    @Transactional
    public FamilyDto declineInvitation(CurrentUser current, Long familyId) {
        current.requireAuthenticated();
        Family family = findFamily(familyId);
        boolean invited = current.id().equals(family.getPendingSpouseUserId());
        boolean member = current.id().equals(family.getMaleUserId()) || current.id().equals(family.getFemaleUserId());
        if (!invited && !member) {
            throw ApiException.notFound("Приглашение в эту семью не найдено");
        }
        family.setPendingSpouseUserId(null);
        UserAccount me = find(current.id());
        return toDto(family, me);
    }

    private UserAccount checkSpouseCandidate(UserAccount me, Long spouseUserId) {
        UserAccount spouse = find(spouseUserId);
        requireAdultUser(spouse);
        if (spouse.getId().equals(me.getId())) {
            throw ApiException.badRequest("Нельзя пригласить в семью самого себя");
        }
        if (spouse.getFamilyId() != null) {
            throw ApiException.conflict(spouse.getDisplayName() + " уже состоит в другой семье");
        }
        if (!families.findAllByPendingSpouseUserId(spouse.getId()).isEmpty()) {
            throw ApiException.conflict(spouse.getDisplayName() + " уже приглашён(а) в другую семью");
        }
        if (spouse.getGender() == null) {
            throw ApiException.badRequest("У партнёра не указан пол — попросите заполнить профиль");
        }
        if (spouse.getGender() == me.getGender()) {
            throw ApiException.badRequest("Семью могут создать мужчина и женщина с разным полом");
        }
        return spouse;
    }

    @Transactional
    public Family ensureFamilyForParent(UserAccount parent) {
        if (parent.getFamilyId() != null) {
            return findFamily(parent.getFamilyId());
        }
        Family family = families.save(singleParentFamily(parent));
        parent.setFamilyId(family.getId());
        attachLooseChildren(parent, family.getId());
        return family;
    }

    static boolean sharesFamily(UserAccount adult, UserAccount child) {
        return child.getRole() == RoleType.CHILD
                && adult.getRole() == RoleType.USER
                && !adult.getId().equals(child.getId())
                && adult.getFamilyId() != null
                && adult.getFamilyId().equals(child.getFamilyId());
    }

    static Gender opposite(Gender gender) {
        return gender == Gender.MALE ? Gender.FEMALE : Gender.MALE;
    }

    private Family singleParentFamily(UserAccount parent) {
        if (parent.getGender() == Gender.MALE) {
            return Family.builder().maleUserId(parent.getId()).build();
        }
        if (parent.getGender() == Gender.FEMALE) {
            return Family.builder().femaleUserId(parent.getId()).build();
        }
        throw ApiException.badRequest("Укажите пол в профиле — без этого нельзя создать семью");
    }

    private void attachLooseChildren(UserAccount parent, Long familyId) {
        users.findByParentIdOrderByIdAsc(parent.getId()).stream()
                .filter(c -> c.getRole() == RoleType.CHILD && c.getFamilyId() == null)
                .forEach(c -> c.setFamilyId(familyId));
    }

    private boolean partnerSlotFilled(Family family, UserAccount me) {
        if (me.getGender() == Gender.MALE) {
            return family.getFemaleUserId() != null;
        }
        if (me.getGender() == Gender.FEMALE) {
            return family.getMaleUserId() != null;
        }
        return family.getMaleUserId() != null && family.getFemaleUserId() != null;
    }

    private FamilyDto toDto(Family family, UserAccount viewer) {
        String maleName = family.getMaleUserId() == null ? null : find(family.getMaleUserId()).getDisplayName();
        String femaleName = family.getFemaleUserId() == null ? null : find(family.getFemaleUserId()).getDisplayName();
        String pendingName = family.getPendingSpouseUserId() == null ? null
                : users.findById(family.getPendingSpouseUserId()).map(UserAccount::getDisplayName).orElse(null);
        List<UserDto> children = users.findByFamilyIdOrderByIdAsc(family.getId()).stream()
                .filter(u -> u.getRole() == RoleType.CHILD)
                .map(mapper::toDto)
                .toList();
        boolean canAddSpouse = viewer.getRole() == RoleType.USER
                && viewer.getFamilyId() != null
                && viewer.getFamilyId().equals(family.getId())
                && !partnerSlotFilled(family, viewer)
                && family.getPendingSpouseUserId() == null;
        return new FamilyDto(family.getId(), family.getMaleUserId(), maleName, family.getFemaleUserId(), femaleName,
                children, canAddSpouse, family.getPendingSpouseUserId(), pendingName);
    }

    private Family findFamily(Long id) {
        return families.findById(id).orElseThrow(() -> ApiException.notFound("Семья не найдена"));
    }

    private UserAccount find(Long id) {
        return users.findById(id).orElseThrow(() -> ApiException.notFound("Пользователь #" + id + " не найден"));
    }

    private static void requireAdultUser(UserAccount user) {
        if (user.getRole() != RoleType.USER) {
            throw ApiException.forbidden("Семью могут создавать только взрослые пользователи");
        }
    }
}
