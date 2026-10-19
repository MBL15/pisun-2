package ru.sportplatform.event.repository;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.event.domain.Registration;

public interface RegistrationRepository extends JpaRepository<Registration, Long> {

    List<Registration> findByEventIdOrderByCreatedAtAsc(Long eventId);

    long countByEventIdAndStatus(Long eventId, ApplicationStatus status);

    List<Registration> findByEventIdAndParticipantIdAndStatusIn(Long eventId, Long participantId,
                                                                Collection<ApplicationStatus> statuses);

    List<Registration> findByParticipantIdOrRegisteredByIdOrderByCreatedAtDesc(Long participantId, Long registeredById);
}
