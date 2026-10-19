package ru.sportplatform.common.dto;

import java.time.Instant;
import java.util.List;

import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.AiStatus;

/**
 * Вердикт ИИ-модератора.
 *
 * @param hold true — событие пользователя нужно придержать до решения администратора
 *             (событие допущенной организации публикуется всё равно, вердикт только сигнализирует)
 * @param blocked true — жёсткая блокировка по стоп-триггерам; не отправляется администратору на проверку
 */
public record EventVerificationResult(
        Long verdictId,
        AiStatus status,
        AgeRestriction ageRestriction,
        String summary,
        List<String> reasons,
        List<String> recommendations,
        String source,
        boolean hold,
        boolean blocked,
        Instant checkedAt
) {
}
