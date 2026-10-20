package ru.sportplatform.event.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.event.domain.Registration;

public interface RegistrationRepository extends JpaRepository<Registration, Long> {

    List<Registration> findByEventIdOrderByCreatedAtAsc(Long eventId);

    long countByEventIdAndStatus(Long eventId, ApplicationStatus status);

    boolean existsByEventIdAndParticipantIdAndStatus(Long eventId, Long participantId, ApplicationStatus status);

    List<Registration> findByParticipantIdOrRegisteredByIdOrderByCreatedAtDesc(Long participantId, Long registeredById);

    List<Registration> findByAwaitingParentApprovalTrue();
}
