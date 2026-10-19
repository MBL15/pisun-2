package ru.sportplatform.moderation.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.moderation.domain.ModerationAction;

public interface ModerationActionRepository extends JpaRepository<ModerationAction, Long> {

    List<ModerationAction> findTop200ByOrderByCreatedAtDesc();
}
