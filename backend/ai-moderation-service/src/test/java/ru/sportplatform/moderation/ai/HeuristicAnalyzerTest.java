package ru.sportplatform.moderation.ai;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDateTime;

import org.junit.jupiter.api.Test;

import ru.sportplatform.common.enums.Audience;
import ru.sportplatform.moderation.ai.HeuristicAnalyzer.HeuristicResult;

class HeuristicAnalyzerTest {

    private final HeuristicAnalyzer analyzer = new HeuristicAnalyzer();

    @Test
    void hardBlock_detectsExplicitRussianWords() {
        HeuristicResult result = analyze("Встреча", "Приходите, будет порно и сиськи на экране");
        assertTrue(result.isHardBlocked());
    }

    @Test
    void hardBlock_detectsLatinWords() {
        HeuristicResult result = analyze("Party", "porno stream tonight");
        assertTrue(result.isHardBlocked());
    }

    @Test
    void hardBlock_allowsCleanSportsDescription() {
        HeuristicResult result = analyze("Футбол во дворе", "Дружеская игра без опыта, принесите воду");
        assertFalse(result.isHardBlocked());
    }

    @Test
    void hardBlock_doesNotFlagUnrelatedWords() {
        HeuristicResult result = analyze("Выставка", "Спортивная выставка инвентаря в парке");
        assertFalse(result.isHardBlocked());
    }

    @Test
    void hardBlock_detectsListedProfanity() {
        HeuristicResult result = analyze("Тренировка", "на поле оставили говно");
        assertTrue(result.isHardBlocked());
    }

    @Test
    void forbidden_detectsGamblingAndSmoking() {
        HeuristicResult result = analyze("Вечер", "кальян, водка и ставки на матч");
        assertTrue(result.isFlagged());
        assertFalse(result.isHardBlocked());
    }

    @Test
    void hardBlock_shortWordUsesWordBoundary() {
        HeuristicResult inWord = analyze("Мотивация", "большой интузиазм у команды");
        assertFalse(inWord.isHardBlocked());
    }

    private HeuristicResult analyze(String title, String description) {
        return analyzer.analyzeEvent(title, description, "Форма свободная", Audience.ALL,
                LocalDateTime.now().plusDays(2), null);
    }
}
