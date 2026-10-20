package ru.sportplatform.moderation.ai;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import ru.sportplatform.common.enums.Audience;

class HeuristicAnalyzerTest {

    private HeuristicAnalyzer analyzer;

    @BeforeEach
    void setUp() {
        analyzer = new HeuristicAnalyzer();
    }

    @Test
    void flagsSexInTitle() {
        var result = analyzer.analyzeEvent(
                "секс встреча",
                "Достаточно длинное описание мероприятия для проверки эвристики модератора платформы.",
                null,
                Audience.ALL,
                LocalDateTime.now().plusDays(1),
                null);
        assertTrue(result.isFlagged());
    }

    @Test
    void flagsDrochInTitle() {
        var result = analyzer.analyzeEvent(
                "Дрочильня",
                "Описание длиннее сорока символов для рекомендаций качества карточки события.",
                null,
                Audience.ALL,
                LocalDateTime.now().plusDays(1),
                null);
        assertTrue(result.isFlagged());
    }

    @Test
    void approvesNeutralEvent() {
        var result = analyzer.analyzeEvent(
                "Утренняя пробежка",
                "Спокойный бег в парке для всех желающих, без особых требований к подготовке.",
                "Кроссовки",
                Audience.ALL,
                LocalDateTime.now().plusDays(1).withHour(9),
                null);
        assertFalse(result.isFlagged());
    }
}
