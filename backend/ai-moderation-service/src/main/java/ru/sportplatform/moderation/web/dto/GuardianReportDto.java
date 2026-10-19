package ru.sportplatform.moderation.web.dto;

import java.util.List;

/** Сводка Хранителя качества за последние сутки — чтобы ИИ не был чёрным ящиком. */
public record GuardianReportDto(
        long checks,
        long flagged,
        long autoUnpublished,
        List<String> topReasons,
        int flaggedVisibleComments,
        String commentSuggestion
) {
}
