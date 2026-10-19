package ru.sportplatform.common.dto;

import java.time.LocalDateTime;

import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.common.enums.OrganizerType;
import ru.sportplatform.common.enums.RegistrationMode;

/** Короткий снимок мероприятия для межсервисного обмена (модерация, генерация документов). */
public record EventSnapshotDto(
        Long id,
        String title,
        String sportName,
        LocalDateTime startAt,
        Integer durationMinutes,
        String address,
        String conditions,
        String organizerContact,
        Long organizerUserId,
        String organizerName,
        OrganizerType organizerType,
        RegistrationMode registrationMode,
        EventStatus status,
        AgeRestriction ageRestriction
) {
}
