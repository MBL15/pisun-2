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

/** Журнал решений администратора. */
@Entity
@Table(name = "moderation_actions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationAction {

    public enum Type {
        ORGANIZATION_APPROVED,
        ORGANIZATION_REJECTED,
        EVENT_UNPUBLISHED,
        EVENT_DELETED,
        EVENT_PUBLISHED,
        COMMENT_HIDDEN,
        COMMENT_RESTORED,
        COMMENT_DELETED,
        SETTINGS_CHANGED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private Type type;

    @Column(length = 30)
    private String targetType;

    private Long targetId;

    @Column(length = 300)
    private String targetTitle;

    @Column(length = 1000)
    private String reason;

    private Long adminId;

    @Column(length = 120)
    private String adminName;

    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
