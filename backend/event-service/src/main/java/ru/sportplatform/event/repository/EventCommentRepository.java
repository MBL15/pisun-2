package ru.sportplatform.event.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.event.domain.EventComment;

public interface EventCommentRepository extends JpaRepository<EventComment, Long> {

    List<EventComment> findByEventIdOrderByCreatedAtAsc(Long eventId);

    List<EventComment> findAllByOrderByCreatedAtDesc();

    long countByEventIdAndHiddenFalse(Long eventId);
}
