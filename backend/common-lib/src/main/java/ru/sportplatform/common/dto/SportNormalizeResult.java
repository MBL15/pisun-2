package ru.sportplatform.common.dto;

import java.util.List;

public record SportNormalizeResult(
        Long existingSportTypeId,
        String existingSportName,
        String proposedName,
        String category,
        String emoji,
        List<String> tags,
        String defaultAgeRestriction,
        boolean acceptable,
        String explanation,
        List<AgentSuggestion> suggestions,
        String source
) {
    public SportNormalizeResult {
        if (tags == null) {
            tags = List.of();
        }
        if (suggestions == null) {
            suggestions = List.of();
        }
    }
}
