package ru.sportplatform.common.policy;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

/** Жёсткие нарушения: мероприятие удаляется сразу, без очереди администратора. */
public final class SevereContentPolicy {

    public static final int PENALTY_MIN = 20;
    public static final int PENALTY_MAX = 30;

    private SevereContentPolicy() {
    }

    public static int randomPenalty() {
        return ThreadLocalRandom.current().nextInt(PENALTY_MIN, PENALTY_MAX + 1);
    }

    public static boolean requiresInstantRemoval(List<String> reasons) {
        if (reasons == null || reasons.isEmpty()) {
            return false;
        }
        return reasons.stream().anyMatch(SevereContentPolicy::isInstantRemovalReason);
    }

    public static boolean isInstantRemovalReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return false;
        }
        String normalized = reason.toLowerCase();
        return normalized.contains("наркотические вещества")
                || normalized.contains("оружие и насилие")
                || normalized.contains("сексуальный контент")
                || normalized.contains("насилие над детьми")
                || normalized.contains("оскорбления и дискриминация (жёсткие)");
    }
}
