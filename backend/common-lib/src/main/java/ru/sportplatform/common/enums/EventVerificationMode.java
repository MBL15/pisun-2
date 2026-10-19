package ru.sportplatform.common.enums;

/** Режим проверки события агентом Event Quality Guardian. */
public enum EventVerificationMode {
    /** Черновик в форме — без записи в ленту вердиктов. */
    DRAFT,
    /** Сохранение или публикация — с аудитом. */
    PUBLISH
}
