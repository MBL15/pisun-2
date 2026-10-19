package ru.sportplatform.event.service;

import java.time.LocalDate;

import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.common.enums.RegistrationMode;

/**
 * @param scope "public" — только опубликованные; "all" — все статусы (только для администратора)
 */
public record EventFilter(
        String q,
        Long sportTypeId,
        RegistrationMode mode,
        LocalDate from,
        LocalDate to,
        Boolean childSafe,
        Long organizationId,
        Long organizerUserId,
        String scope,
        EventStatus status,
        boolean includePast
) {
}
