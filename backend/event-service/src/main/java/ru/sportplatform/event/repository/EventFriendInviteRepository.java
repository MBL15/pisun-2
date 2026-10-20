package ru.sportplatform.event.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.event.domain.EventFriendInvite;

public interface EventFriendInviteRepository extends JpaRepository<EventFriendInvite, Long> {

    List<EventFriendInvite> findByEventId(Long eventId);
}
