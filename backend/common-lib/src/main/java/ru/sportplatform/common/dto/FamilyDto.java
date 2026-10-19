package ru.sportplatform.common.dto;

import java.util.List;

/** Семья из двух взрослых и их детских аккаунтов. */
public record FamilyDto(
        Long id,
        Long maleUserId,
        String maleName,
        Long femaleUserId,
        String femaleName,
        List<UserDto> children
) {
}
