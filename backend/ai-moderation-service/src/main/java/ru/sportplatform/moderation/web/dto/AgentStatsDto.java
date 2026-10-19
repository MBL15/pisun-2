package ru.sportplatform.moderation.web.dto;

import java.util.List;

public record AgentStatsDto(
        long checks24h,
        long flagged24h,
        long autoUnpublish24h,
        List<String> topFlagReasons
) {
}
