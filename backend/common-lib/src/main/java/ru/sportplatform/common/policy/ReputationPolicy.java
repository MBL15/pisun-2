package ru.sportplatform.common.policy;

/** Пороги репутации организаторов-пользователей (не клубов). */
public final class ReputationPolicy {

    public static final int DEFAULT_SCORE = 100;
    public static final int MIN_TO_CREATE_EVENTS = 30;
    public static final int MODERATION_PENALTY = 20;
    public static final int MAX_SCORE = 100;

    /** Баллы за отзыв участника: индекс — число звёзд (1…5). */
    private static final int[] REVIEW_STAR_DELTA = {0, -8, -4, 0, 3, 5};

    private ReputationPolicy() {
    }

    public static int normalize(Integer stored) {
        return stored == null ? DEFAULT_SCORE : stored;
    }

    public static boolean canUserOrganize(int reputation) {
        return reputation >= MIN_TO_CREATE_EVENTS;
    }

    public static int reviewDeltaForStars(int stars) {
        if (stars < 1 || stars > 5) {
            throw new IllegalArgumentException("stars must be 1..5");
        }
        return REVIEW_STAR_DELTA[stars];
    }

    /**
     * В БД хранится «сырой» суммарный балл без ограничения сверху: иначе обрезанный у порога вклад
     * делал бы итог зависимым от истории изменений. В интерфейс и проверки балл попадает
     * ограниченным через {@link #display(Integer)}.
     */
    public static int applyDelta(int current, int delta) {
        return normalize(current) + delta;
    }

    /** Балл для показа и пороговых проверок: null → DEFAULT_SCORE, результат зажат в 0…MAX_SCORE. */
    public static int display(Integer stored) {
        return Math.min(MAX_SCORE, Math.max(0, normalize(stored)));
    }
}
