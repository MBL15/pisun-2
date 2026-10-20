package ru.sportplatform.event.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Оценка мероприятия участником (1–5 звёзд), влияет на репутацию организатора. */
@Entity
@Table(name = "event_reviews", uniqueConstraints = @UniqueConstraint(name = "uk_review_event_author", columnNames = {
        "eventId", "authorId"}), indexes = {
                @Index(name = "idx_review_event", columnList = "eventId"),
                @Index(name = "idx_review_organizer", columnList = "organizerUserId")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long eventId;

    @Column(nullable = false)
    private Long organizerUserId;

    @Column(nullable = false)
    private Long authorId;

    @Column(nullable = false, length = 120)
    private String authorName;

    @Column(length = 20)
    private String authorAvatarColor;

    @Column(nullable = false)
    private int stars;

    @Column(length = 1000)
    private String comment;

    private Instant createdAt;

    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
