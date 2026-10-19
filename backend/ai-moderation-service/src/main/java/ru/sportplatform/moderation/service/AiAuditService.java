package ru.sportplatform.moderation.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.moderation.domain.AiAuditLog;
import ru.sportplatform.moderation.repository.AiAuditLogRepository;
import ru.sportplatform.moderation.web.dto.AgentStatsDto;

@Service
@RequiredArgsConstructor
public class AiAuditService {

    private final AiAuditLogRepository auditLog;

    @Transactional
    public void log(String agent, String input, String verdict, String source, long latencyMs, Long userId) {
        auditLog.save(AiAuditLog.builder()
                .agent(agent)
                .inputHash(sha256(input))
                .verdict(verdict)
                .source(source)
                .latencyMs(latencyMs)
                .userId(userId)
                .createdAt(Instant.now())
                .build());
    }

    @Transactional(readOnly = true)
    public AgentStatsDto guardianStats24h() {
        Instant since = Instant.now().minusSeconds(86_400);
        long total = auditLog.countByAgentAndCreatedAtAfter("EVENT_QUALITY_GUARDIAN", since);
        Map<String, Long> byVerdict = auditLog.countByVerdictSince(since, "EVENT_QUALITY_GUARDIAN").stream()
                .collect(Collectors.toMap(row -> String.valueOf(row[0]), row -> (Long) row[1], (a, b) -> a, LinkedHashMap::new));
        long flagged = byVerdict.getOrDefault("FLAGGED", 0L);
        long holds = byVerdict.getOrDefault("HOLD", 0L);
        List<String> topReasons = List.of(
                "Короткое описание",
                "Контакт не в поле «Контакты»",
                "Несоответствие вида спорта");
        return new AgentStatsDto(total, flagged, holds, topReasons);
    }

    private static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest((input == null ? "" : input).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            return "na";
        }
    }
}
