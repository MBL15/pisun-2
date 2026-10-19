package ru.sportplatform.common.dto;

public record SportCurationResult(
        boolean adequate,
        String canonicalName,
        String category,
        boolean childSafe,
        String reason,
        String source
) {
}
