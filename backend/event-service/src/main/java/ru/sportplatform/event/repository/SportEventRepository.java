package ru.sportplatform.event.repository;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.event.domain.SportEvent;

public interface SportEventRepository extends JpaRepository<SportEvent, Long> {

    List<SportEvent> findAllByOrderByStartAtAsc();

    List<SportEvent> findByStatusOrderByStartAtAsc(EventStatus status);

    List<SportEvent> findByOrganizerUserIdOrderByStartAtDesc(Long organizerUserId);

    long countBySportTypeIdAndStatus(Long sportTypeId, EventStatus status);

    /**
     * Чтение события с блокировкой строки до конца транзакции.
     * Используется при записи/решениях, чтобы проверки лимита и дублей были атомарны.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from SportEvent e where e.id = :id")
    Optional<SportEvent> findByIdForUpdate(@Param("id") Long id);
}
