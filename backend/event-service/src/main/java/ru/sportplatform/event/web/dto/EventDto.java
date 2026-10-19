package ru.sportplatform.event.web.dto;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.AiStatus;
import ru.sportplatform.common.enums.Audience;
import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.common.enums.OrganizerType;
import ru.sportplatform.common.enums.RegistrationMode;
import ru.sportplatform.event.domain.SkillLevel;

public record EventDto(
        Long id,
        String title,
        String description,
        Long sportTypeId,
        String sportName,
        String sportEmoji,
        boolean sportCustom,
        String sportEquipment,
        String sportSafetyNotes,
        LocalDateTime startAt,
        LocalDateTime endAt,
        Integer durationMinutes,
        String address,
        String locationNote,
        Double latitude,
        Double longitude,
        String conditions,
        SkillLevel level,
        Audience audience,
        Integer capacity,
        RegistrationMode registrationMode,
        EventStatus status,
        OrganizerType organizerType,
        Long organizerUserId,
        String organizerName,
        Long organizationId,
        /** null, если зритель не подтверждённый участник и не организатор. */
        String organizerContact,
        AiStatus aiStatus,
        AgeRestriction ageRestriction,
        String aiSummary,
        List<String> aiReasons,
        String moderationReason,
        String moderatedBy,
        Instant moderatedAt,
        Instant createdAt,
        long participantsCount,
        long pendingCount,
        Integer spotsLeft,
        long commentsCount,
        boolean past,
        ViewerState viewer
) {

    /** Что текущий пользователь может делать с событием — фронтенду не нужно дублировать правила. */
    public record ViewerState(
            boolean organizer,
            boolean registrationOpen,
            String registrationBlockedReason,
            boolean canSeeContacts,
            List<RegistrationDto> myRegistrations
    ) {
    }
}
