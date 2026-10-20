package ru.sportplatform.common.policy;

/** Сообщения при автоматической блокировке аккаунта. */
public final class AccountBanPolicy {

    public static final String USER_MESSAGE =
            "Аккаунт заблокирован за использование запрещённой фразы. "
                    + "Обратитесь к администратору платформы, если считаете блокировку ошибкой.";

    private AccountBanPolicy() {
    }
}
