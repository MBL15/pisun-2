package ru.sportplatform.common.dto;

/** Запись в общий журнал решений агентов. Пишет и ai-moderation-service, и event-service. */
public record AiAuditRequest(
        String agent,
        String action,
        String verdict,
        String source,
        String detail,
        Long latencyMs
) {
}
