package ru.sportplatform.identity.domain;

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
import ru.sportplatform.common.enums.Gender;
import ru.sportplatform.common.enums.RoleType;

@Entity
@Table(name = "user_accounts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String displayName;

    @Column(length = 160)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private RoleType role;

    private Integer age;

    @Column(length = 120)
    private String city;

    @Column(length = 1000)
    private String bio;

    @Column(length = 500)
    private String interests;

    @Column(length = 20)
    private String avatarColor;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    /** Семья взрослого или ребёнка. */
    private Long familyId;

    /** Для детского аккаунта — id родителя. */
    private Long parentId;

    /** Для аккаунта организации — id её профиля. */
    private Long organizationId;

    private boolean demo;

    @Column(length = 60)
    private String demoLabel;

    private Integer demoOrder;

    /** Репутация организатора-пользователя; для клубов не используется. */
    private Integer reputation;

    /** Галочка доверия (для USER — после заявки и одобрения админом). */
    private boolean verified;

    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
