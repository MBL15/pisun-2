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
        return toDto(findFamily(me.getFamilyId()));
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
            return List.of();
        }
        Gender opposite = opposite(me.getGender());
        return users.findAllByOrderByIdAsc().stream()
                .filter(u -> u.getRole() == RoleType.USER)
                .filter(u -> u.getFamilyId() == null)
                .filter(u -> u.getGender() == opposite)
                .filter(u -> !u.getId().equals(me.getId()))
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
        UserAccount spouse = find(spouseUserId);
        requireAdultUser(spouse);
        if (spouse.getFamilyId() != null) {
            throw ApiException.conflict(spouse.getDisplayName() + " уже состоит в другой семье");
        }
        if (spouse.getGender() == null) {
            throw ApiException.badRequest("У партнёра не указан пол — попросите заполнить профиль");
        }
        if (spouse.getGender() == me.getGender()) {
            throw ApiException.badRequest("Семью могут создать мужчина и женщина с разным полом");
        }
        if (spouse.getId().equals(me.getId())) {
            throw ApiException.badRequest("Нельзя создать семью с самим собой");
        }

        UserAccount male = me.getGender() == Gender.MALE ? me : spouse;
        UserAccount female = me.getGender() == Gender.FEMALE ? me : spouse;
        Family family = families.save(Family.builder().maleUserId(male.getId()).femaleUserId(female.getId()).build());
        male.setFamilyId(family.getId());
        female.setFamilyId(family.getId());
        users.findByParentIdOrderByIdAsc(male.getId()).stream()
                .filter(c -> c.getRole() == RoleType.CHILD && c.getFamilyId() == null)
                .forEach(c -> c.setFamilyId(family.getId()));
        return toDto(family);
    }

    static boolean sharesFamily(UserAccount adult, UserAccount child) {
        return child.getRole() == RoleType.CHILD
                && adult.getFamilyId() != null
                && adult.getFamilyId().equals(child.getFamilyId());
    }

    static Gender opposite(Gender gender) {
        return gender == Gender.MALE ? Gender.FEMALE : Gender.MALE;
    }

    private FamilyDto toDto(Family family) {
        UserAccount male = find(family.getMaleUserId());
        UserAccount female = find(family.getFemaleUserId());
        List<UserDto> children = users.findByFamilyIdOrderByIdAsc(family.getId()).stream()
                .filter(u -> u.getRole() == RoleType.CHILD)
                .map(mapper::toDto)
                .toList();
        return new FamilyDto(family.getId(), male.getId(), male.getDisplayName(), female.getId(), female.getDisplayName(), children);
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
