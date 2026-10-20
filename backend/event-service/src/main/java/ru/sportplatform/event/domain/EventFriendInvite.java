package ru.sportplatform.event.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "event_friend_invites", uniqueConstraints = @UniqueConstraint(name = "uk_event_invite", columnNames = {
        "eventId", "friendUserId"}), indexes = @Index(name = "idx_invite_event", columnList = "eventId"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EventFriendInvite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long eventId;

    @Column(nullable = false)
    private Long friendUserId;
}
