package ru.sportplatform.moderation.ai;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.stereotype.Component;

import ru.sportplatform.common.dto.AgentSuggestion;
import ru.sportplatform.common.dto.SportNormalizeResult;
import ru.sportplatform.common.util.TextUtils;

/** Эвристический куратор вида спорта (LLM опционально подключается в AiVerificationService). */
@Component
public class SportTypeNormalizer {

    private static final Set<String> REJECT = Set.of(
            "казино", "ставки", "порно", "наркот", "оружие", "убий");

    public SportNormalizeResult normalize(String query, List<String> knownNames) {
        String trimmed = query == null ? "" : query.trim();
        if (trimmed.length() < 2) {
            return new SportNormalizeResult(null, null, null, null, null, List.of(), "ADULT_ONLY", false,
                    "Слишком короткое название — опишите вид спорта подробнее.", List.of(), "HEURISTIC");
        }
        String low = trimmed.toLowerCase(Locale.ROOT);
        for (String bad : REJECT) {
            if (low.contains(bad)) {
                return new SportNormalizeResult(null, null, null, null, null, List.of(), "ADULT_ONLY", false,
                        "Такой запрос не подходит для спортивного справочника.", List.of(), "HEURISTIC");
            }
        }
        Match best = bestMatch(trimmed, knownNames);
        List<AgentSuggestion> hints = new ArrayList<>();
        if (best != null && best.score() >= 0.85) {
            hints.add(new AgentSuggestion("INFO", "sportType",
                    "Уже есть «" + best.name() + "» — можно выбрать его из списка.", best.score(), true));
            return new SportNormalizeResult(null, best.name(), best.name(), category(best.name()), emoji(best.name()),
                    tags(best.name()), ageDefault(best.name()), true,
                    "Найдено близкое совпадение в реестре.", hints, "HEURISTIC");
        }
        String canonical = TextUtils.prettify(trimmed);
        if (best != null && best.score() >= 0.65) {
            hints.add(new AgentSuggestion("INFO", "sportType",
                    "Похоже на «" + best.name() + "» — это оно?", best.score(), false));
        }
        hints.add(new AgentSuggestion("INFO", "sportType",
                "Предлагаем каноническое название «" + canonical + "» — можно принять или поправить.", 0.7, true));
        return new SportNormalizeResult(null, best != null ? best.name() : null, canonical, category(canonical),
                emoji(canonical), tags(canonical), ageDefault(canonical), true,
                "Новый вид спорта выглядит допустимым — подтвердите название перед сохранением.", hints, "HEURISTIC");
    }

    private Match bestMatch(String query, List<String> knownNames) {
        String key = TextUtils.normalizeKey(query);
        Match best = null;
        for (String name : knownNames) {
            double score = similarity(key, TextUtils.normalizeKey(name));
            if (best == null || score > best.score()) {
                best = new Match(name, score);
            }
        }
        return best;
    }

    private static double similarity(String a, String b) {
        if (a.equals(b)) {
            return 1.0;
        }
        if (a.contains(b) || b.contains(a)) {
            return 0.9;
        }
        int dist = levenshtein(a, b);
        int max = Math.max(a.length(), b.length());
        if (max == 0) {
            return 0;
        }
        return 1.0 - (double) dist / max;
    }

    private static int levenshtein(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) {
            dp[i][0] = i;
        }
        for (int j = 0; j <= b.length(); j++) {
            dp[0][j] = j;
        }
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + cost);
            }
        }
        return dp[a.length()][b.length()];
    }

    private static String category(String name) {
        String low = name.toLowerCase(Locale.ROOT);
        if (low.contains("шахмат") || low.contains("логическ")) {
            return "интеллектуальный";
        }
        if (low.contains("двор") || low.contains("зарядк")) {
            return "дворовый";
        }
        if (low.contains("футбол") || low.contains("хоккей") || low.contains("волей") || low.contains("баскет")) {
            return "командный";
        }
        if (low.contains("бокс") || low.contains("единобор") || low.contains("борьб")) {
            return "индивидуальный";
        }
        return "индивидуальный";
    }

    private static String emoji(String name) {
        String low = name.toLowerCase(Locale.ROOT);
        if (low.contains("футбол")) {
            return "⚽";
        }
        if (low.contains("шахмат")) {
            return "♟️";
        }
        if (low.contains("бег") || low.contains("ходьб")) {
            return "🏃";
        }
        if (low.contains("йог")) {
            return "🧘";
        }
        if (low.contains("бокс") || low.contains("единобор")) {
            return "🥊";
        }
        return "🏅";
    }

    private static List<String> tags(String name) {
        String low = name.toLowerCase(Locale.ROOT);
        List<String> tags = new ArrayList<>();
        if (low.contains("двор") || low.contains("зарядк")) {
            tags.add("#двор");
            tags.add("#дети");
        }
        if (low.contains("шахмат") || low.contains("йог") || low.contains("ходьб")) {
            tags.add("#без_инвентаря");
        }
        return tags;
    }

    private static String ageDefault(String name) {
        String low = name.toLowerCase(Locale.ROOT);
        if (low.contains("бокс") || low.contains("единобор") || low.contains("стрельб") || low.contains("боев")) {
            return "ADULT_ONLY";
        }
        return "CHILD_SAFE";
    }

    private record Match(String name, double score) {
    }
}
