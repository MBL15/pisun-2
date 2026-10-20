package ru.sportplatform.identity.web.dto;

public record CreateFamilyRequest(
        /** Необязательно: можно создать семью одному и добавить детей, партнёра — позже. */
        Long spouseUserId
) {
}
