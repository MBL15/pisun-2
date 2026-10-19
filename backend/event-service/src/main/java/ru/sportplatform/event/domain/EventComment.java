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
import ru.sportplatform.common.enums.RoleType;

@Entity
@Table(name = "event_comments", indexes = @Index(name = "idx_comment_event", columnList = "eventId"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long eventId;

    /** Комментарий, на который отвечают (null — новая ветка). */
    private Long parentId;

    @Column(nullable = false)
    private Long authorId;

    @Column(nullable = false, length = 120)
    private String authorName;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private RoleType authorRole;

    @Column(length = 20)
    private String authorAvatarColor;

    /** Автор — организатор мероприятия: такие сообщения помечаются в обсуждении. */
    private boolean organizerReply;

    @Column(nullable = false, length = 2000)
    private String text;

    private boolean hidden;

    private boolean hiddenByAi;

    @Column(length = 500)
    private String hiddenReason;

    @Column(length = 120)
    private String hiddenBy;

    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
