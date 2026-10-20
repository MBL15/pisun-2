package ru.sportplatform.common.dto;

import java.util.List;

/** Семья взрослых (один или двое) и детских аккаунтов. */
public record FamilyDto(
        Long id,
        Long maleUserId,
        String maleName,
        Long femaleUserId,
        String femaleName,
        List<UserDto> children,
        boolean canAddSpouse
) {
}
