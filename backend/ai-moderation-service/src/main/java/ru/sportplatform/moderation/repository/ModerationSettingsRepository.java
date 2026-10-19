package ru.sportplatform.moderation.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.moderation.domain.ModerationSettings;

public interface ModerationSettingsRepository extends JpaRepository<ModerationSettings, Long> {

    Optional<ModerationSettings> findFirstByOrderByIdAsc();
}
