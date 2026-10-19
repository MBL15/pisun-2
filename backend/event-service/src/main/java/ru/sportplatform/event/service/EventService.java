package ru.sportplatform.event.service;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.EventSnapshotDto;
import ru.sportplatform.common.dto.EventStatusChangeRequest;
import ru.sportplatform.common.dto.EventVerificationRequest;
import ru.sportplatform.common.dto.EventVerificationResult;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.AiStatus;
import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.common.enums.Audience;
import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.common.enums.OrganizerType;
import ru.sportplatform.common.enums.RegistrationMode;
import ru.sportplatform.common.enums.RoleType;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.event.client.AiClient;
import ru.sportplatform.event.client.IdentityClient;
import ru.sportplatform.event.domain.Registration;
import ru.sportplatform.event.domain.SkillLevel;
import ru.sportplatform.event.domain.SportEvent;
import ru.sportplatform.event.domain.SportType;
import ru.sportplatform.event.repository.EventCommentRepository;
import ru.sportplatform.event.repository.RegistrationRepository;
import ru.sportplatform.event.repository.SportEventRepository;
import ru.sportplatform.event.web.dto.EventDto;
import ru.sportplatform.event.web.dto.EventForm;
import ru.sportplatform.event.web.dto.RegistrationDto;

@Service
@RequiredArgsConstructor
public class EventService {

    private final SportEventRepository events;
    private final RegistrationRepository registrations;
    private final EventCommentRepository comments;
    private final SportTypeService sportTypes;
    private final IdentityClient identity;
    private final AiClient ai;

    // ---------- чтение ----------

    @Transactional(readOnly = true)
    public List<EventDto> list(CurrentUser current, EventFilter filter) {
        boolean adminScope = "all".equalsIgnoreCase(filter.scope()) && current.isAdmin();
        List<SportEvent> source = adminScope
                ? events.findAllByOrderByStartAtAsc()
                : events.findByStatusOrderByStartAtAsc(EventStatus.PUBLISHED);
        LocalDateTime now = LocalDateTime.now();
        boolean childViewer = current.is(RoleType.CHILD);

        return source.stream()
                .filter(e -> !adminScope || filter.status() == null || e.getStatus() == filter.status())
                .filter(e -> adminScope || filter.includePast() || e.getEndAt().isAfter(now))
                .filter(e -> !childViewer || isChildSafe(e))
                .filter(e -> !Boolean.TRUE.equals(filter.childSafe()) || isChildSafe(e))
                .filter(e -> filter.sportTypeId() == null || e.getSportType().getId().equals(filter.sportTypeId()))
                .filter(e -> filter.mode() == null || e.getRegistrationMode() == filter.mode())
                .filter(e -> filter.organizationId() == null || filter.organizationId().equals(e.getOrganizationId()))
                .filter(e -> filter.organizerUserId() == null
                        || (filter.organizerUserId().equals(e.getOrganizerUserId()) && e.getOrganizerType() == OrganizerType.USER))
                .filter(e -> filter.from() == null || !e.getStartAt().toLocalDate().isBefore(filter.from()))
                .filter(e -> filter.to() == null || !e.getStartAt().toLocalDate().isAfter(filter.to()))
                .filter(e -> TextUtils.containsIgnoreCase(searchText(e), filter.q()))
                .map(e -> toDto(e, current))
                .toList();
    }

    @Transactional(readOnly = true)
    public EventDto get(CurrentUser current, Long id) {
        return toDto(findVisible(current, id), current);
    }

    /** Все события, которыми управляет текущий аккаунт, включая снятые и ожидающие проверки. */
    @Transactional(readOnly = true)
    public List<EventDto> mine(CurrentUser current) {
        current.requireAuthenticated();
        return events.findByOrganizerUserIdOrderByStartAtDesc(current.id()).stream()
                .map(e -> toDto(e, current))
                .toList();
    }

    /**
     * Правила доступа к карточке: удалённое видят только организатор, записавшиеся и администратор;
     * событие на проверке ИИ — только организатор и администратор; детям недоступны события 18+.
     */
    public SportEvent findVisible(CurrentUser current, Long id) {
        SportEvent event = find(id);
        boolean privileged = isOrganizer(event, current) || current.isAdmin();
        boolean registered = current.isAuthenticated() && registrations.findByEventIdOrderByCreatedAtAsc(id).stream()
                .anyMatch(r -> current.id().equals(r.getParticipantId()) || current.id().equals(r.getRegisteredById()));

        if (event.getStatus() == EventStatus.DELETED && !privileged && !registered) {
            throw ApiException.notFound("Мероприятие удалено администратором и больше недоступно");
        }
        if (event.getStatus() == EventStatus.ON_REVIEW && !privileged) {
            throw ApiException.notFound("Мероприятие проверяется модератором и пока не опубликовано");
        }
        if (current.is(RoleType.CHILD) && !isChildSafe(event) && !registered) {
            throw ApiException.forbidden("Это мероприятие для взрослых. Попроси родителя подобрать занятие вместе");
        }
        return event;
    }

    public SportEvent find(Long id) {
        return events.findById(id).orElseThrow(() -> ApiException.notFound("Мероприятие #" + id + " не найдено"));
    }

    // ---------- создание и редактирование ----------

    @Transactional
    public EventDto create(CurrentUser current, EventForm form) {
        current.requireAuthenticated();
        UserDto author = identity.getUser(current.id());
        ensureCanOrganize(author);
        validateDates(form);

        SportType sport = sportTypes.resolve(form.sportTypeId(), form.customSportName(), author.id());
        boolean orgEvent = author.role() == RoleType.ORGANIZATION;

        SportEvent event = new SportEvent();
        applyForm(event, form, sport);
        event.setOrganizerType(orgEvent ? OrganizerType.ORGANIZATION : OrganizerType.USER);
        event.setOrganizerUserId(author.id());
        event.setOrganizerName(orgEvent ? author.organizationName() : author.displayName());
        event.setOrganizationId(orgEvent ? author.organizationId() : null);

        applyVerdict(event, ai.verifyEvent(verificationRequest(event)));
        return toDto(events.save(event), current);
    }

    @Transactional
    public EventDto update(CurrentUser current, Long id, EventForm form) {
        current.requireAuthenticated();
        SportEvent event = find(id);
        if (!isOrganizer(event, current)) {
            throw ApiException.forbidden("Изменять мероприятие может только его организатор");
        }
        if (event.getStatus() == EventStatus.UNPUBLISHED || event.getStatus() == EventStatus.DELETED) {
            throw ApiException.forbidden("Мероприятие снято администратором: " + event.getModerationReason());
        }
        validateDates(form);
        long approved = registrations.countByEventIdAndStatus(id, ApplicationStatus.APPROVED);
        if (form.capacity() != null && form.capacity() < approved) {
            throw ApiException.badRequest("Уже подтверждено участников: " + approved + ". Нельзя сделать мест меньше");
        }
        SportType sport = sportTypes.resolve(form.sportTypeId(), form.customSportName(), current.id());
        applyForm(event, form, sport);
        applyVerdict(event, ai.verifyEvent(verificationRequest(event)));
        return toDto(event, current);
    }

    private void ensureCanOrganize(UserDto author) {
        switch (author.role()) {
            case CHILD -> throw ApiException.forbidden("Детский аккаунт не может создавать мероприятия — попроси родителя");
            case ADMIN -> throw ApiException.forbidden(
                    "Администратор модерирует платформу и не публикует события. Переключитесь на пользователя или организацию");
            case ORGANIZATION -> {
                if (!author.isApprovedOrganization()) {
                    throw ApiException.forbidden("Организация ещё не допущена администратором. "
                            + "Публикация событий откроется сразу после одобрения заявки");
                }
            }
            default -> {
            }
        }
    }

    private static void validateDates(EventForm form) {
        if (form.startAt().isBefore(LocalDateTime.now().minusMinutes(5))) {
            throw ApiException.badRequest("Дата и время начала должны быть в будущем");
        }
    }

    private static void applyForm(SportEvent event, EventForm form, SportType sport) {
        event.setTitle(form.title().trim());
        event.setDescription(form.description().trim());
        event.setSportType(sport);
        event.setStartAt(form.startAt());
        event.setDurationMinutes(form.durationMinutes());
        event.setAddress(form.address().trim());
        event.setLocationNote(form.locationNote());
        event.setLatitude(form.latitude());
        event.setLongitude(form.longitude());
        event.setConditions(form.conditions());
        event.setLevel(form.level() == null ? SkillLevel.ANY : form.level());
        event.setAudience(form.audience() == null ? Audience.ALL : form.audience());
        event.setCapacity(form.capacity());
        event.setRegistrationMode(form.registrationMode());
        event.setOrganizerContact(form.organizerContact());
    }

    private static EventVerificationRequest verificationRequest(SportEvent event) {
        return new EventVerificationRequest(event.getId(), event.getTitle(), event.getDescription(),
                event.getConditions(), event.getSportType().getName(), event.getAudience(), event.getStartAt(),
                event.getOrganizerName(), event.getOrganizerType() == OrganizerType.ORGANIZATION);
    }

    /**
     * Событие пользователя с вердиктом FLAGGED уходит на проверку администратору. Допущенная организация
     * публикует без премодерации — вердикт ИИ лишь подсвечивается администратору.
     */
    private static void applyVerdict(SportEvent event, EventVerificationResult verdict) {
        event.setAiStatus(verdict.status());
        event.setAgeRestriction(event.getAudience() == Audience.ADULTS ? AgeRestriction.ADULT_ONLY : verdict.ageRestriction());
        event.setAiSummary(verdict.summary());
        event.setAiReasons(verdict.reasons() == null ? null : String.join("\n", verdict.reasons()));
        boolean hold = verdict.hold() && event.getOrganizerType() == OrganizerType.USER;
        event.setStatus(hold ? EventStatus.ON_REVIEW : EventStatus.PUBLISHED);
    }

    // ---------- модерация (вызывается ai-moderation-service) ----------

    @Transactional
    public EventSnapshotDto changeStatus(Long id, EventStatusChangeRequest request) {
        SportEvent event = find(id);
        if (request.status() == null) {
            throw ApiException.badRequest("Не указан новый статус");
        }
        if (request.status() != EventStatus.PUBLISHED && TextUtils.isBlank(request.reason())) {
            throw ApiException.badRequest("Укажите причину — её увидит организатор");
        }
        event.setStatus(request.status());
        event.setModerationReason(request.status() == EventStatus.PUBLISHED ? null : request.reason().trim());
        event.setModeratedBy(request.moderatorName());
        event.setModeratedAt(Instant.now());
        if (request.status() == EventStatus.PUBLISHED && event.getAiStatus() == AiStatus.FLAGGED) {
            event.setAiSummary("Проверено администратором вручную. " + nullToEmpty(event.getAiSummary()));
        }
        return snapshot(event);
    }

    @Transactional(readOnly = true)
    public EventSnapshotDto snapshot(Long id) {
        return snapshot(find(id));
    }

    // ---------- правила ----------

    public boolean isOrganizer(SportEvent event, CurrentUser current) {
        return current.isAuthenticated() && current.id().equals(event.getOrganizerUserId());
    }

    public boolean isChildSafe(SportEvent event) {
        return event.getAgeRestriction() == AgeRestriction.CHILD_SAFE && event.getAiStatus() == AiStatus.AI_APPROVED;
    }

    /** null — записаться можно; иначе понятная пользователю причина, почему нельзя. */
    public String registrationBlockedReason(SportEvent event, CurrentUser current, long approvedCount) {
        if (!current.isAuthenticated()) {
            return "Войдите или выберите демо-аккаунт, чтобы записаться";
        }
        switch (event.getStatus()) {
            case UNPUBLISHED -> {
                return "Мероприятие снято с публикации администратором — запись закрыта";
            }
            case DELETED -> {
                return "Мероприятие удалено администратором — запись закрыта";
            }
            case ON_REVIEW -> {
                return "Мероприятие ещё проверяется модератором";
            }
            default -> {
            }
        }
        if (event.getEndAt().isBefore(LocalDateTime.now())) {
            return "Мероприятие уже прошло";
        }
        if (isOrganizer(event, current)) {
            return "Вы организатор этого мероприятия";
        }
        if (current.isAdmin()) {
            return "Администратор не записывается на мероприятия";
        }
        if (current.is(RoleType.ORGANIZATION)) {
            return "Аккаунт организации не может записываться как участник";
        }
        if (current.is(RoleType.CHILD) && !isChildSafe(event)) {
            return "Мероприятие только для взрослых";
        }
        if (event.getCapacity() != null && approvedCount >= event.getCapacity()) {
            return "Все места заняты";
        }
        return null;
    }

    // ---------- маппинг ----------

    public EventDto toDto(SportEvent e, CurrentUser current) {
        List<Registration> regs = registrations.findByEventIdOrderByCreatedAtAsc(e.getId());
        long approved = regs.stream().filter(r -> r.getStatus() == ApplicationStatus.APPROVED).count();
        long pending = regs.stream().filter(r -> r.getStatus() == ApplicationStatus.PENDING).count();

        List<RegistrationDto> mine = !current.isAuthenticated() ? List.of() : regs.stream()
                .filter(r -> current.id().equals(r.getParticipantId()) || current.id().equals(r.getRegisteredById()))
                .map(EventService::toDto)
                .toList();
        boolean organizer = isOrganizer(e, current);
        boolean canSeeContacts = organizer || current.isAdmin()
                || mine.stream().anyMatch(r -> r.status() == ApplicationStatus.APPROVED);
        String blocked = registrationBlockedReason(e, current, approved);

        return new EventDto(
                e.getId(), e.getTitle(), e.getDescription(),
                e.getSportType().getId(), e.getSportType().getName(), e.getSportType().getEmoji(), e.getSportType().isCustom(),
                e.getStartAt(), e.getEndAt(), e.getDurationMinutes(),
                e.getAddress(), e.getLocationNote(), e.getLatitude(), e.getLongitude(),
                e.getConditions(), e.getLevel(), e.getAudience(), e.getCapacity(),
                e.getRegistrationMode(), e.getStatus(),
                e.getOrganizerType(), e.getOrganizerUserId(), e.getOrganizerName(), e.getOrganizationId(),
                canSeeContacts ? e.getOrganizerContact() : null,
                e.getAiStatus(), e.getAgeRestriction(), e.getAiSummary(), splitReasons(e.getAiReasons()),
                e.getModerationReason(), e.getModeratedBy(), e.getModeratedAt(), e.getCreatedAt(),
                approved, pending,
                e.getCapacity() == null ? null : (int) Math.max(0, e.getCapacity() - approved),
                comments.countByEventIdAndHiddenFalse(e.getId()),
                e.getEndAt().isBefore(LocalDateTime.now()),
                new EventDto.ViewerState(organizer, blocked == null, blocked, canSeeContacts, mine)
        );
    }

    public static RegistrationDto toDto(Registration r) {
        return new RegistrationDto(r.getId(), r.getEventId(), r.getParticipantId(), r.getParticipantName(),
                r.isChild(), r.getParticipantAge(), r.getRegisteredById(), r.getRegisteredByName(), r.getStatus(),
                r.getMessage(), r.getDecisionComment(), r.getCreatedAt(), r.getDecidedAt());
    }

    private static EventSnapshotDto snapshot(SportEvent e) {
        return new EventSnapshotDto(e.getId(), e.getTitle(), e.getSportType().getName(), e.getStartAt(),
                e.getDurationMinutes(), e.getAddress(), e.getConditions(), e.getOrganizerContact(),
                e.getOrganizerUserId(), e.getOrganizerName(), e.getOrganizerType(), e.getRegistrationMode(),
                e.getStatus(), e.getAgeRestriction());
    }

    private static String searchText(SportEvent e) {
        return String.join(" ", e.getTitle(), nullToEmpty(e.getDescription()), e.getSportType().getName(),
                e.getAddress(), e.getOrganizerName(), nullToEmpty(e.getConditions()));
    }

    private static List<String> splitReasons(String raw) {
        return TextUtils.isBlank(raw) ? List.of() : Arrays.stream(raw.split("\n")).filter(s -> !s.isBlank()).toList();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    static boolean isFree(SportEvent event) {
        return event.getRegistrationMode() == RegistrationMode.FREE;
    }
}
