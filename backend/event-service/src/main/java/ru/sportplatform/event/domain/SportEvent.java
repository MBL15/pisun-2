package ru.sportplatform.event.domain;

import java.time.Instant;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.AiStatus;
import ru.sportplatform.common.enums.Audience;
import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.common.enums.OrganizerType;
import ru.sportplatform.common.enums.RegistrationMode;

@Entity
@Table(name = "sport_events")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SportEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 160)
    private String title;

    @Column(length = 4000)
    private String description;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "sport_type_id")
    private SportType sportType;

    @Column(nullable = false)
    private LocalDateTime startAt;

    private Integer durationMinutes;

    @Column(nullable = false, length = 300)
    private String address;

    /** Как найти место: «у главного входа», «площадка за школой». */
    @Column(length = 500)
    private String locationNote;

    private Double latitude;

    private Double longitude;

    /** Условия участия: подготовка, инвентарь, форма одежды, стоимость. */
    @Column(length = 2000)
    private String conditions;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private SkillLevel level;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Audience audience;

    /** null — без ограничения мест. */
    private Integer capacity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RegistrationMode registrationMode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventStatus status;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrganizerType organizerType;

    /** Аккаунт, который управляет событием (автор или представитель организации). */
    @Column(nullable = false)
    private Long organizerUserId;

    @Column(nullable = false, length = 160)
    private String organizerName;

    private Long organizationId;

    /** Организационная информация, которая открывается только подтверждённым участникам. */
    @Column(length = 1000)
    private String organizerContact;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AiStatus aiStatus;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private AgeRestriction ageRestriction;

    @Column(length = 1000)
    private String aiSummary;

    @Column(length = 2000)
    private String aiReasons;

    @Column(length = 1000)
    private String moderationReason;

    @Column(length = 120)
    private String moderatedBy;

    private Instant moderatedAt;

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

    public LocalDateTime getEndAt() {
        return startAt.plusMinutes(durationMinutes == null ? 90 : durationMinutes);
    }
}
