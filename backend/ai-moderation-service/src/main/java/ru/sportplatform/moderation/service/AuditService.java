package ru.sportplatform.moderation.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.dto.AiAuditRequest;
import ru.sportplatform.moderation.domain.AiAuditLog;
import ru.sportplatform.moderation.repository.AiAuditLogRepository;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AiAuditLogRepository logs;

    @Transactional
    public void record(String agent, String action, String input, String verdict, String source, String detail, long latencyMs) {
        String text = detail == null ? "" : detail;
        if (text.length() > 2000) {
            text = text.substring(0, 2000);
        }
        logs.save(AiAuditLog.builder()
                .agent(agent)
                .action(action)
                .inputHash(hash(input))
                .verdict(verdict)
                .source(source)
                .detail(text)
                .latencyMs(latencyMs)
                .build());
    }

    @Transactional
    public void record(AiAuditRequest request) {
        record(request.agent(), request.action(), request.detail(), request.verdict(), request.source(),
                request.detail(), request.latencyMs() == null ? 0 : request.latencyMs());
    }

    private static String hash(String input) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest((input == null ? "" : input).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest).substring(0, 16);
        } catch (Exception e) {
            return "na";
        }
    }
}
