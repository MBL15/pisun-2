package ru.sportplatform.common.dto;

/** Внутренний запрос ai-moderation-service → identity-service с решением администратора. */
public record OrganizationDecisionRequest(
        boolean approved,
        String reason,
        String reviewedBy
) {
}
