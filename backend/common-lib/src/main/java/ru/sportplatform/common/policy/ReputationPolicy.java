package ru.sportplatform.common.policy;

/** Пороги репутации организаторов-пользователей (не клубов). */
public final class ReputationPolicy {

    public static final int DEFAULT_SCORE = 100;
    public static final int MIN_TO_CREATE_EVENTS = 30;
    public static final int MODERATION_PENALTY = 20;

    private ReputationPolicy() {
    }

    public static int normalize(Integer stored) {
        return stored == null ? DEFAULT_SCORE : stored;
    }

    public static boolean canUserOrganize(int reputation) {
        return reputation >= MIN_TO_CREATE_EVENTS;
    }
}
