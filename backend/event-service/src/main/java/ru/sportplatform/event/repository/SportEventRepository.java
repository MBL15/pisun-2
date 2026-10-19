package ru.sportplatform.event.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.event.domain.SportEvent;

public interface SportEventRepository extends JpaRepository<SportEvent, Long> {

    List<SportEvent> findAllByOrderByStartAtAsc();

    List<SportEvent> findByStatusOrderByStartAtAsc(EventStatus status);

    List<SportEvent> findByOrganizerUserIdOrderByStartAtDesc(Long organizerUserId);

    long countBySportTypeIdAndStatus(Long sportTypeId, EventStatus status);

    long countBySportTypeId(Long sportTypeId);

    List<SportEvent> findBySportTypeId(Long sportTypeId);
}
