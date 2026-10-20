package ru.sportplatform.moderation.repository;

import java.time.Instant;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import ru.sportplatform.moderation.domain.AiAuditLog;

public interface AiAuditLogRepository extends JpaRepository<AiAuditLog, Long> {

    @Query("""
            select a.verdict, count(a) from AiAuditLog a
            where a.createdAt >= ?1 and a.agent = ?2
            group by a.verdict
            """)
    List<Object[]> countByVerdictSince(Instant since, String agent);

    long countByAgentAndCreatedAtAfter(String agent, Instant since);
}
