package ru.sportplatform.event.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import ru.sportplatform.event.domain.EventReview;

public interface EventReviewRepository extends JpaRepository<EventReview, Long> {

    List<EventReview> findByEventIdOrderByCreatedAtDesc(Long eventId);

    Optional<EventReview> findByEventIdAndAuthorId(Long eventId, Long authorId);

    @Query("select coalesce(avg(r.stars), 0) from EventReview r where r.eventId = :eventId")
    double averageStars(@Param("eventId") Long eventId);

    long countByEventId(Long eventId);
}
