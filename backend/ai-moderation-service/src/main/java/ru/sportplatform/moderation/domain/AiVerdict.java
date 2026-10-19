package ru.sportplatform.moderation.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.AiStatus;

/** Журнал проверок ИИ — администратор видит, что и почему было помечено. */
@Entity
@Table(name = "ai_verdicts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiVerdict {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long eventId;

    @Column(length = 160)
    private String eventTitle;

    @Column(length = 160)
    private String organizerName;

    private boolean organizationEvent;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AiStatus status;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AgeRestriction ageRestriction;

    @Column(length = 1000)
    private String summary;

    @Column(length = 2000)
    private String reasons;

    @Column(length = 30)
    private String source;

    private boolean hold;

    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
