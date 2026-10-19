package ru.sportplatform.common.web;

import jakarta.servlet.http.HttpServletRequest;
import ru.sportplatform.common.enums.RoleType;

public final class UserHeaders {

    public static final String USER_ID = "X-User-Id";
    public static final String USER_ROLE = "X-User-Role";

    private UserHeaders() {
    }

    public static CurrentUser from(HttpServletRequest request) {
        Long id = parseId(request.getHeader(USER_ID));
        RoleType role = parseRole(request.getHeader(USER_ROLE));
        if (id == null || role == null) {
            return CurrentUser.ANONYMOUS;
        }
        return new CurrentUser(id, role);
    }

    private static Long parseId(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return Long.parseLong(raw.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static RoleType parseRole(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return RoleType.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
