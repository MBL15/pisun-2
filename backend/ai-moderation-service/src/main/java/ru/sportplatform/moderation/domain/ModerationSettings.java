package ru.sportplatform.moderation.domain;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Единственная строка с настройками ИИ-модератора, которыми управляет администратор. */
@Entity
@Table(name = "moderation_settings")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ModerationSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Выключено — события публикуются без автоматической проверки. */
    private boolean aiEnabled;

    /** Придерживать помеченные события пользователей до решения администратора. */
    private boolean autoHoldFlagged;

    /** Использовать внешнюю LLM (работает, только если задан ключ AI_LLM_API_KEY). */
    private boolean llmEnabled;

    /** Автоматически скрывать сообщения в обсуждениях с явными нарушениями. */
    private boolean commentFilterEnabled;

    /** Дополнительные стоп-слова администратора через запятую. */
    @Column(length = 2000)
    private String customStopWords;

    private Instant updatedAt;

    @Column(length = 120)
    private String updatedBy;
}
