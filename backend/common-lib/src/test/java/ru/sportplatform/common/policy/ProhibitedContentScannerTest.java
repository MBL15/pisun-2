package ru.sportplatform.common.policy;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class ProhibitedContentScannerTest {

    @Test
    void detectsSexAndDrochInTitle() {
        assertTrue(ProhibitedContentScanner.requiresInstantBan("секс клуб", "нормальное описание", null));
        assertTrue(ProhibitedContentScanner.requiresInstantBan("Дрочильня", "описание", null));
        assertTrue(ProhibitedContentScanner.mentionsDroch("Дрочильня в подвале", null, null));
    }

    @Test
    void detectsHomophobicSlur() {
        assertTrue(ProhibitedContentScanner.requiresInstantBan("гомосек встреча", "текст", null));
    }

    @Test
    void kochBratanPhraseTriggersAccountBan() {
        assertTrue(ProhibitedContentScanner.requiresInstantAccountBan("коч братан", null, null));
        assertTrue(ProhibitedContentScanner.requiresInstantAccountBan("привет", "КОЧ братан!", null));
        assertFalse(ProhibitedContentScanner.requiresInstantAccountBan("Утренняя пробежка", null, null));
    }

    @Test
    void cleanSportEventPasses() {
        assertFalse(ProhibitedContentScanner.requiresInstantBan(
                "Утренняя пробежка 5 км", "Лёгкий темп для новичков", "Кроссовки"));
        assertFalse(ProhibitedContentScanner.mentionsDroch("Шахматный блиц", "Турнир", null));
    }
}
