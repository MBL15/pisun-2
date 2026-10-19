package ru.sportplatform.common.error;

import java.time.Instant;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Единый формат ошибки для всех сервисов. Фронтенд показывает поле message пользователю. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
        int status,
        String code,
        String message,
        Map<String, String> fields,
        Instant timestamp
) {
    public static ApiError of(int status, String code, String message) {
        return new ApiError(status, code, message, null, Instant.now());
    }
}
