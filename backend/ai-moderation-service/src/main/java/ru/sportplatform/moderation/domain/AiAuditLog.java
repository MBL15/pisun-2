package ru.sportplatform.moderation.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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

/** Общий журнал обоих агентов: кто вызвал, какой вердикт и откуда он взялся. */
@Entity
@Table(name = "ai_audit_log")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiAuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 40)
    private String agent;

    @Column(nullable = false, length = 40)
    private String action;

    @Column(length = 64)
    private String inputHash;

    @Column(length = 40)
    private String verdict;

    /** LLM, HEURISTIC или MERGED. */
    @Column(length = 20)
    private String source;

    private Long latencyMs;

    @Column(length = 2000)
    private String detail;

    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
