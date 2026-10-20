package ru.sportplatform.identity.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Lob;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ru.sportplatform.common.enums.VerificationRequestStatus;

@Entity
@Table(name = "verification_requests", indexes = @Index(name = "idx_verification_user", columnList = "userId"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VerificationRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 2000)
    private String message;

    /** JSON: [{ "fileName": "...", "contentBase64": "..." }] */
    @Lob
    @Column(columnDefinition = "TEXT")
    private String attachmentsJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private VerificationRequestStatus status;

    @Column(length = 500)
    private String rejectionReason;

    @Column(length = 120)
    private String reviewedBy;

    private Instant createdAt;

    private Instant reviewedAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
