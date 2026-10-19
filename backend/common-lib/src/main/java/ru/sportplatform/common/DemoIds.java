package ru.sportplatform.common;

/**
 * Идентификаторы демо-данных. Каждый сервис заполняет свою часть БД независимо,
 * поэтому ссылки между сервисами в стартовых данных опираются на эти константы
 * (на чистой БД identity-сервис создаёт аккаунты строго в этом порядке).
 */
public final class DemoIds {

    public static final long ADULT = 1L;
    public static final long CHILD = 2L;
    public static final long ADMIN = 3L;
    public static final long ORG_APPROVED_OWNER = 4L;
    public static final long ORG_PENDING_OWNER = 5L;
    public static final long ADULT_IRINA = 6L;
    public static final long ADULT_DMITRY = 7L;
    public static final long ADULT_SPOUSE = 8L;

    public static final long ORG_APPROVED = 1L;
    public static final long ORG_PENDING = 2L;

    public static final String ADULT_NAME = "Алексей Петров";
    public static final String CHILD_NAME = "Миша Петров";
    public static final String ADMIN_NAME = "Елена Смирнова";
    public static final String ORG_APPROVED_OWNER_NAME = "Сергей Волков";
    public static final String ORG_PENDING_OWNER_NAME = "Ольга Кузнецова";
    public static final String IRINA_NAME = "Ирина Соколова";
    public static final String DMITRY_NAME = "Дмитрий Орлов";
    public static final String ADULT_SPOUSE_NAME = "Мария Петрова";

    public static final String ORG_APPROVED_NAME = "Дворовые легенды";
    public static final String ORG_PENDING_NAME = "Шахматный клуб «Ладья»";

    private DemoIds() {
    }
}
