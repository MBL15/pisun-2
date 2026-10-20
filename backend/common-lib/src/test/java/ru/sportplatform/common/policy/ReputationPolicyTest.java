package ru.sportplatform.common.policy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ReputationPolicyTest {

    @Test
    void normalizeNullAsDefault() {
        assertEquals(ReputationPolicy.DEFAULT_SCORE, ReputationPolicy.normalize(null));
    }

    @Test
    void applyDeltaWithNullCurrentUsesDefault() {
        assertEquals(80, ReputationPolicy.applyDelta(null, -20));
    }

    @Test
    void applyDeltaClampedToZeroAndMax() {
        assertEquals(0, ReputationPolicy.applyDelta(10, -50));
        assertEquals(ReputationPolicy.MAX_SCORE, ReputationPolicy.applyDelta(95, 20));
    }

    @Test
    void canUserOrganizeRespectsThreshold() {
        assertTrue(ReputationPolicy.canUserOrganize(ReputationPolicy.MIN_TO_CREATE_EVENTS));
        assertFalse(ReputationPolicy.canUserOrganize(ReputationPolicy.MIN_TO_CREATE_EVENTS - 1));
    }
}
