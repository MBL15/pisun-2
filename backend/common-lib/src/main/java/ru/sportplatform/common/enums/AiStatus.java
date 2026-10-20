package ru.sportplatform.common.enums;

public enum AiStatus {
    AI_APPROVED,
    FLAGGED,
    /** Проверка не выполнялась (ИИ был недоступен): для детского контура событие небезопасно. */
    UNCHECKED
}
