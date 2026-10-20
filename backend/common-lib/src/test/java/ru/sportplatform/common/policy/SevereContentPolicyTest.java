package ru.sportplatform.common.policy;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.Test;

class SevereContentPolicyTest {

    @Test
    void instantRemovalFromHeuristicReasonLine() {
        assertTrue(SevereContentPolicy.requiresInstantRemoval(
                List.of("Сексуальный контент: «секс»")));
    }

    @Test
    void gamblingReasonIsNotInstantRemovalByPolicyAlone() {
        assertFalse(SevereContentPolicy.requiresInstantRemoval(
                List.of("Азартные игры и ставки: «на деньги»")));
    }

    @Test
    void penaltyInConfiguredRange() {
        for (int i = 0; i < 20; i++) {
            int p = SevereContentPolicy.randomPenalty();
            assertTrue(p >= SevereContentPolicy.PENALTY_MIN && p <= SevereContentPolicy.PENALTY_MAX);
        }
    }
}
