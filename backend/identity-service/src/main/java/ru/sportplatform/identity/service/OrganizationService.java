package ru.sportplatform.identity.service;

import java.time.Instant;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.OrganizationDecisionRequest;
import ru.sportplatform.common.dto.OrganizationDto;
import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.common.enums.RoleType;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.identity.domain.Organization;
import ru.sportplatform.identity.domain.UserAccount;
import ru.sportplatform.identity.repository.OrganizationRepository;
import ru.sportplatform.identity.repository.UserAccountRepository;
import ru.sportplatform.identity.web.dto.OrganizationForm;

@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizations;
    private final UserAccountRepository users;
    private final IdentityMapper mapper;

    /** Обычные пользователи видят только допущенные организации; администратор — все, с фильтром по статусу. */
    @Transactional(readOnly = true)
    public List<OrganizationDto> list(CurrentUser current, ApplicationStatus status, String query) {
        List<Organization> source;
        if (current.isAdmin()) {
            source = status == null ? organizations.findAllByOrderByCreatedAtDesc()
                    : organizations.findByStatusOrderByCreatedAtDesc(status);
        } else {
            source = organizations.findByStatusOrderByCreatedAtDesc(ApplicationStatus.APPROVED);
        }
        return source.stream()
                .filter(org -> TextUtils.containsIgnoreCase(org.getName() + " " + org.getDescription() + " "
                        + org.getSportsInterests() + " " + org.getCity(), query))
                .map(mapper::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public OrganizationDto get(CurrentUser current, Long id) {
        Organization org = find(id);
        boolean owner = current.isAuthenticated() && current.id().equals(org.getOwnerUserId());
        if (org.getStatus() != ApplicationStatus.APPROVED && !owner && !current.isAdmin()) {
            throw ApiException.notFound("Страница организации недоступна: организация ещё не допущена администратором");
        }
        return mapper.toDto(org);
    }

    /** Внутренний доступ для других сервисов — без проверки видимости. */
    @Transactional(readOnly = true)
    public OrganizationDto getInternal(Long id) {
        return mapper.toDto(find(id));
    }

    @Transactional(readOnly = true)
    public OrganizationDto my(CurrentUser current) {
        current.requireAuthenticated();
        return organizations.findFirstByOwnerUserId(current.id())
                .map(mapper::toDto)
                .orElseThrow(() -> ApiException.notFound("У аккаунта ещё нет заявки организации"));
    }

    @Transactional
    public OrganizationDto submit(CurrentUser current, OrganizationForm form) {
        current.requireAuthenticated();
        if (!current.is(RoleType.ORGANIZATION)) {
            throw ApiException.forbidden("Заявку подаёт аккаунт организации. Зарегистрируйте организацию на экране входа");
        }
        if (organizations.findFirstByOwnerUserId(current.id()).isPresent()) {
            throw ApiException.conflict("Заявка уже подана — её можно отредактировать");
        }
        UserAccount owner = users.findById(current.id())
                .orElseThrow(() -> ApiException.notFound("Аккаунт не найден"));
        Organization org = organizations.save(UserService.newOrganization(form, owner.getId()));
        owner.setOrganizationId(org.getId());
        return mapper.toDto(org);
    }

    /** Редактирование профиля. Отклонённая заявка после правок уходит на повторное рассмотрение. */
    @Transactional
    public OrganizationDto update(CurrentUser current, Long id, OrganizationForm form) {
        current.requireAuthenticated();
        Organization org = find(id);
        if (!current.id().equals(org.getOwnerUserId())) {
            throw ApiException.forbidden("Редактировать профиль может только представитель организации");
        }
        org.setName(form.name().trim());
        org.setDescription(form.description().trim());
        org.setSportsInterests(form.sportsInterests().trim());
        org.setCity(form.city());
        org.setAddress(form.address());
        org.setContacts(form.contacts());
        org.setWebsite(form.website());
        if (org.getStatus() == ApplicationStatus.REJECTED) {
            org.setStatus(ApplicationStatus.PENDING);
            org.setReviewedAt(null);
            org.setReviewedBy(null);
        }
        return mapper.toDto(org);
    }

    @Transactional
    public OrganizationDto decide(Long id, OrganizationDecisionRequest decision) {
        Organization org = find(id);
        if (decision.approved()) {
            org.setStatus(ApplicationStatus.APPROVED);
            org.setRejectionReason(null);
        } else {
            if (TextUtils.isBlank(decision.reason())) {
                throw ApiException.badRequest("При отклонении заявки укажите причину — её увидит организация");
            }
            org.setStatus(ApplicationStatus.REJECTED);
            org.setRejectionReason(decision.reason().trim());
        }
        org.setReviewedAt(Instant.now());
        org.setReviewedBy(decision.reviewedBy());
        return mapper.toDto(org);
    }

    private Organization find(Long id) {
        return organizations.findById(id)
                .orElseThrow(() -> ApiException.notFound("Организация #" + id + " не найдена"));
    }
}
