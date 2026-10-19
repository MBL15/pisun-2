package ru.sportplatform.moderation.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.moderation.domain.AiVerdict;

public interface AiVerdictRepository extends JpaRepository<AiVerdict, Long> {

    List<AiVerdict> findTop100ByOrderByCreatedAtDesc();
}
