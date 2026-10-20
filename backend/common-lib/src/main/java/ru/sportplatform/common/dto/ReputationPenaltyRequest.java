package ru.sportplatform.common.dto;

/** Запрос на снижение репутации после отрицательного решения модерации по событию пользователя. */
public record ReputationPenaltyRequest(String reason) {
}
