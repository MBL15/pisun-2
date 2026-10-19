package ru.sportplatform.event.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.sportplatform.common.enums.ApplicationStatus;

/** Запись на мероприятие (FREE → сразу APPROVED) или заявка (BY_APPLICATION → PENDING). */
@Entity
@Table(name = "event_registrations", indexes = {
        @Index(name = "idx_registration_event", columnList = "eventId"),
        @Index(name = "idx_registration_participant", columnList = "participantId")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Registration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long eventId;

    /** Кто будет участвовать (взрослый или ребёнок). */
    @Column(nullable = false)
    private Long participantId;

    @Column(nullable = false, length = 120)
    private String participantName;

    private boolean child;

    private Integer participantAge;

    /** Кто оформил запись: сам участник или родитель. */
    @Column(nullable = false)
    private Long registeredById;

    @Column(length = 120)
    private String registeredByName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ApplicationStatus status;

    @Column(length = 500)
    private String message;

    @Column(length = 500)
    private String decisionComment;

    private Instant createdAt;

    private Instant decidedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public boolean isActive() {
        return status == ApplicationStatus.PENDING || status == ApplicationStatus.APPROVED;
    }
}
