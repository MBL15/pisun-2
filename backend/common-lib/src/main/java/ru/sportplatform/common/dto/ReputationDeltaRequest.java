package ru.sportplatform.common.dto;

/** Изменение репутации организатора (отзывы участников и т.п.). */
public record ReputationDeltaRequest(int delta, String reason) {
}
