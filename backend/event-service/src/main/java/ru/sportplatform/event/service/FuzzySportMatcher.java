package ru.sportplatform.event.service;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import ru.sportplatform.common.util.TextUtils;

/**
 * Поиск похожих названий без внешней библиотеки: для кириллицы Soundex бесполезен,
 * поэтому пайплайн тот же по ступеням (нормализация, токены и n-граммы, ближайший сосед, оценка),
 * но метрики русские — расстояние Левенштейна, общие токены и общий префикс («футбик» → «футбол»).
 */
public final class FuzzySportMatcher {

    private FuzzySportMatcher() {
    }

    public static double score(String left, String right) {
        String a = fold(left);
        String b = fold(right);
        if (a.isEmpty() || b.isEmpty()) {
            return 0;
        }
        if (a.equals(b)) {
            return 1;
        }
        double best = levenshteinRatio(a, b);
        best = Math.max(best, tokenScore(a, b));
        best = Math.max(best, prefixScore(a, b));
        best = Math.max(best, trigram(a, b));
        return best;
    }

    /** Схлопывает окончания и «й/ь», чтобы «футбик» и «футбол» сходились на «футб». */
    static String fold(String value) {
        String key = TextUtils.normalizeKey(value).replace("й", "и").replace("ь", "").replace("ъ", "");
        key = key.replaceAll("(ик|ок|ка|ец|ия)$", "");
        return key.replaceAll("(.)\\1+", "$1");
    }

    private static double tokenScore(String left, String right) {
        Set<String> a = tokens(left);
        Set<String> b = tokens(right);
        if (a.isEmpty() || b.isEmpty()) {
            return 0;
        }
        Set<String> small = a.size() <= b.size() ? a : b;
        Set<String> large = a.size() <= b.size() ? b : a;
        boolean all = true;
        for (String token : small) {
            if (token.length() < 3) {
                continue;
            }
            if (!large.contains(token)) {
                all = false;
                break;
            }
        }
        if (all && small.stream().anyMatch(token -> token.length() >= 3)) {
            return 0.9;
        }
        return 0;
    }

    private static double prefixScore(String left, String right) {
        int limit = Math.min(left.length(), right.length());
        int shared = 0;
        while (shared < limit && left.charAt(shared) == right.charAt(shared)) {
            shared++;
        }
        int diff = Math.abs(left.length() - right.length());
        double cover = shared / (double) Math.min(left.length(), right.length());
        // Короткий общий кусок («фрис» у «фрисби» и «фристайла») ещё не значит один вид спорта.
        if (shared >= 4 && diff <= 3 && cover >= 0.8) {
            return 0.88;
        }
        return 0;
    }

    private static double trigram(String left, String right) {
        Set<String> a = grams(left);
        Set<String> b = grams(right);
        if (a.isEmpty() || b.isEmpty()) {
            return 0;
        }
        int common = 0;
        for (String gram : a) {
            if (b.contains(gram)) {
                common++;
            }
        }
        return (2.0 * common) / (a.size() + b.size());
    }

    private static Set<String> tokens(String value) {
        Set<String> tokens = new HashSet<>();
        for (String part : value.split(" ")) {
            if (!part.isBlank()) {
                tokens.add(part);
            }
        }
        return tokens;
    }

    private static Set<String> grams(String value) {
        String compact = value.replace(" ", "");
        Set<String> grams = new HashSet<>();
        if (compact.length() < 3) {
            grams.add(compact);
            return grams;
        }
        for (int i = 0; i <= compact.length() - 3; i++) {
            grams.add(compact.substring(i, i + 3));
        }
        return grams;
    }

    private static double levenshteinRatio(String left, String right) {
        int distance = distance(left, right);
        int max = Math.max(left.length(), right.length());
        return max == 0 ? 1 : 1.0 - (double) distance / max;
    }

    private static int distance(String left, String right) {
        int[] prev = new int[right.length() + 1];
        int[] curr = new int[right.length() + 1];
        for (int j = 0; j <= right.length(); j++) {
            prev[j] = j;
        }
        for (int i = 1; i <= left.length(); i++) {
            curr[0] = i;
            for (int j = 1; j <= right.length(); j++) {
                int cost = left.charAt(i - 1) == right.charAt(j - 1) ? 0 : 1;
                curr[j] = Math.min(Math.min(curr[j - 1] + 1, prev[j] + 1), prev[j - 1] + cost);
            }
            int[] swap = prev;
            prev = curr;
            curr = swap;
        }
        return prev[right.length()];
    }

    public static List<String> tokensOf(String value) {
        return new ArrayList<>(tokens(fold(value).toLowerCase(Locale.ROOT)));
    }
}
