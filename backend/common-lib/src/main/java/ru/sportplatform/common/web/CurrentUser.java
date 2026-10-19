package ru.sportplatform.common.web;

import ru.sportplatform.common.enums.RoleType;
import ru.sportplatform.common.error.ApiException;

/**
 * Пользователь, от имени которого выполняется запрос.
 * Авторизация на хакатоне имитируется: фронтенд передаёт X-User-Id и X-User-Role демо-аккаунта.
 */
public record CurrentUser(Long id, RoleType role) {

    public static final CurrentUser ANONYMOUS = new CurrentUser(null, null);

    public boolean isAuthenticated() {
        return id != null && role != null;
    }

    public boolean isAdmin() {
        return role == RoleType.ADMIN;
    }

    public boolean is(RoleType expected) {
        return role == expected;
    }

    public CurrentUser requireAuthenticated() {
        if (!isAuthenticated()) {
            throw ApiException.unauthorized("Войдите или выберите демо-аккаунт, чтобы выполнить действие");
        }
        return this;
    }

    public CurrentUser requireAdmin() {
        requireAuthenticated();
        if (!isAdmin()) {
            throw ApiException.forbidden("Действие доступно только администратору");
        }
        return this;
    }
}
