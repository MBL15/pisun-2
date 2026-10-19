package ru.sportplatform.event.service;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.UserDto;
import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.common.enums.RoleType;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.web.CurrentUser;
import ru.sportplatform.event.client.IdentityClient;
import ru.sportplatform.event.domain.Registration;
import ru.sportplatform.event.domain.SportEvent;
import ru.sportplatform.event.repository.RegistrationRepository;
import ru.sportplatform.event.repository.SportEventRepository;
import ru.sportplatform.event.web.dto.DecisionRequest;
import ru.sportplatform.event.web.dto.MyRegistrationDto;
import ru.sportplatform.event.web.dto.RegistrationDto;
import ru.sportplatform.event.web.dto.RegistrationRequest;

@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final RegistrationRepository registrations;
    private final SportEventRepository events;
    private final EventService eventService;
    private final IdentityClient identity;

    @Transactional
    public RegistrationDto register(CurrentUser current, Long eventId, RegistrationRequest request) {
        current.requireAuthenticated();
        SportEvent event = eventService.find(eventId);
        long approved = registrations.countByEventIdAndStatus(eventId, ApplicationStatus.APPROVED);
        String blocked = eventService.registrationBlockedReason(event, current, approved);
        if (blocked != null) {
            throw ApiException.conflict(blocked);
        }

        UserDto me = identity.getUser(current.id());
        UserDto participant = me;
        if (request != null && request.childId() != null) {
            if (me.role() != RoleType.USER) {
                throw ApiException.forbidden("Записать ребёнка может только родитель");
            }
            participant = identity.getUser(request.childId());
            if (!canManageChild(me, participant)) {
                throw ApiException.forbidden("Можно записывать только своих детей");
            }
            if (!eventService.isChildSafe(event)) {
                throw ApiException.forbidden("Мероприятие не отмечено как безопасное для детей — записать ребёнка нельзя");
            }
        }

        Long participantId = participant.id();
        boolean alreadyActive = !registrations.findByEventIdAndParticipantIdAndStatusIn(eventId, participantId,
                List.of(ApplicationStatus.PENDING, ApplicationStatus.APPROVED)).isEmpty();
        if (alreadyActive) {
            throw ApiException.conflict(participant.id().equals(me.id())
                    ? "Вы уже записаны или ваша заявка ждёт решения"
                    : participant.displayName() + " уже записан(а) на это мероприятие");
        }

        boolean free = EventService.isFree(event);
        Registration registration = registrations.save(Registration.builder()
                .eventId(eventId)
                .participantId(participantId)
                .participantName(participant.displayName())
                .participantAge(participant.age())
                .child(participant.role() == RoleType.CHILD)
                .registeredById(me.id())
                .registeredByName(me.displayName())
                .status(free ? ApplicationStatus.APPROVED : ApplicationStatus.PENDING)
                .message(request == null ? null : request.message())
                .decidedAt(free ? Instant.now() : null)
                .build());
        return EventService.toDto(registration);
    }

    /** Администратор не заменяет организатора: заявки рассматривает только автор мероприятия. */
    @Transactional
    public RegistrationDto decide(CurrentUser current, Long eventId, Long registrationId, DecisionRequest request) {
        current.requireAuthenticated();
        SportEvent event = eventService.find(eventId);
        if (!eventService.isOrganizer(event, current)) {
            throw ApiException.forbidden("Заявки рассматривает только организатор мероприятия");
        }
        if (request.status() != ApplicationStatus.APPROVED && request.status() != ApplicationStatus.REJECTED) {
            throw ApiException.badRequest("Решение может быть только «Принять» или «Отклонить»");
        }
        Registration registration = findForEvent(eventId, registrationId);
        if (registration.getStatus() == ApplicationStatus.CANCELLED) {
            throw ApiException.conflict("Участник сам отменил заявку");
        }
        if (request.status() == ApplicationStatus.APPROVED) {
            if (event.getStatus() != EventStatus.PUBLISHED) {
                throw ApiException.conflict("Мероприятие не опубликовано — принимать заявки нельзя");
            }
            long approved = registrations.countByEventIdAndStatus(eventId, ApplicationStatus.APPROVED);
            if (registration.getStatus() != ApplicationStatus.APPROVED
                    && event.getCapacity() != null && approved >= event.getCapacity()) {
                throw ApiException.conflict("Все места заняты — увеличьте лимит или откажите другим участникам");
            }
        }
        registration.setStatus(request.status());
        registration.setDecisionComment(request.comment());
        registration.setDecidedAt(Instant.now());
        return EventService.toDto(registration);
    }

    @Transactional
    public RegistrationDto cancel(CurrentUser current, Long eventId, Long registrationId) {
        current.requireAuthenticated();
        Registration registration = findForEvent(eventId, registrationId);
        boolean own = current.id().equals(registration.getParticipantId()) || current.id().equals(registration.getRegisteredById());
        if (!own) {
            throw ApiException.forbidden("Отменить можно только свою запись");
        }
        if (!registration.isActive()) {
            throw ApiException.conflict("Запись уже не активна");
        }
        registration.setStatus(ApplicationStatus.CANCELLED);
        registration.setDecidedAt(Instant.now());
        return EventService.toDto(registration);
    }

    /** Организатор и администратор видят все заявки; остальные — только подтверждённый состав без сообщений. */
    @Transactional(readOnly = true)
    public List<RegistrationDto> listForEvent(CurrentUser current, Long eventId) {
        SportEvent event = eventService.findVisible(current, eventId);
        boolean privileged = eventService.isOrganizer(event, current) || current.isAdmin();
        return registrations.findByEventIdOrderByCreatedAtAsc(eventId).stream()
                .filter(r -> privileged || r.getStatus() == ApplicationStatus.APPROVED)
                .map(EventService::toDto)
                .map(r -> privileged ? r : new RegistrationDto(r.id(), r.eventId(), r.participantId(),
                        r.participantName(), r.child(), null, null, null, r.status(), null, null,
                        r.createdAt(), r.decidedAt()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<MyRegistrationDto> mine(CurrentUser current) {
        current.requireAuthenticated();
        List<Registration> own = registrations.findByParticipantIdOrRegisteredByIdOrderByCreatedAtDesc(current.id(), current.id());
        Map<Long, SportEvent> byId = events.findAllById(own.stream().map(Registration::getEventId).distinct().toList())
                .stream().collect(Collectors.toMap(SportEvent::getId, Function.identity()));
        return own.stream()
                .map(r -> Optional.ofNullable(byId.get(r.getEventId()))
                        .map(e -> new MyRegistrationDto(EventService.toDto(r), eventService.toDto(e, current)))
                        .orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    private static boolean canManageChild(UserDto adult, UserDto child) {
        if (child.role() != RoleType.CHILD) {
            return false;
        }
        if (adult.id().equals(child.parentId())) {
            return true;
        }
        return adult.familyId() != null && adult.familyId().equals(child.familyId());
    }

    private Registration findForEvent(Long eventId, Long registrationId) {
        Registration registration = registrations.findById(registrationId)
                .orElseThrow(() -> ApiException.notFound("Заявка #" + registrationId + " не найдена"));
        if (!registration.getEventId().equals(eventId)) {
            throw ApiException.notFound("Заявка не относится к этому мероприятию");
        }
        return registration;
    }
}
