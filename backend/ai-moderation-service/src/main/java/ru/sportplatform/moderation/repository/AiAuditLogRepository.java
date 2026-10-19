package ru.sportplatform.moderation.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import ru.sportplatform.moderation.domain.AiAuditLog;

public interface AiAuditLogRepository extends JpaRepository<AiAuditLog, Long> {

    List<AiAuditLog> findByAgentAndCreatedAtAfterOrderByCreatedAtDesc(String agent, Instant after);
}
