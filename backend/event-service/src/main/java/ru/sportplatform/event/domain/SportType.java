package ru.sportplatform.event.domain;

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

/** Динамический справочник: новые направления добавляются пользователями без изменения кода. */
@Entity
@Table(name = "sport_types")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SportType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 80)
    private String name;

    /** Нормализованный ключ для поиска дублей («Скандинавская  ХОДЬБА» = «скандинавская ходьба»). */
    @Column(nullable = false, unique = true, length = 80)
    private String nameKey;

    @Column(length = 16)
    private String emoji;

    /** true — направление добавлено пользователем при создании события. */
    private boolean custom;

    private Long createdByUserId;

    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
