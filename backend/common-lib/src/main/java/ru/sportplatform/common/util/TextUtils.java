package ru.sportplatform.common.util;

import java.util.Locale;

public final class TextUtils {

    private TextUtils() {
    }

    /** Ключ для сравнения пользовательских названий: «  Скандинавская   ХОДЬБА » → «скандинавская ходьба». */
    public static String normalizeKey(String value) {
        if (value == null) {
            return "";
        }
        return value.trim()
                .replaceAll("\\s+", " ")
                .replace('ё', 'е')
                .replace('Ё', 'Е')
                .toLowerCase(Locale.ROOT);
    }

    /** Аккуратное отображаемое название: убирает лишние пробелы и делает первую букву заглавной. */
    public static String prettify(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim().replaceAll("\\s+", " ");
        if (trimmed.isEmpty()) {
            return trimmed;
        }
        return trimmed.substring(0, 1).toUpperCase(Locale.ROOT) + trimmed.substring(1);
    }

    public static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /** Сленг и сокращения для поиска вида спорта («футбик» → «футбол»). */
    public static String canonicalSportQuery(String raw) {
        if (isBlank(raw)) {
            return "";
        }
        String key = normalizeKey(raw);
        if (key.equals("футбик") || key.equals("футболик") || key.equals("football") || key.startsWith("footbal")) {
            return "футбол";
        }
        if (key.equals("волей") || key.equals("волейболик")) {
            return "волейбол";
        }
        if (key.equals("баскет") || key.equals("баскетик")) {
            return "баскетбол";
        }
        if (key.equals("шах") || (key.startsWith("шах") && key.length() <= 8)) {
            return "шахматы";
        }
        if (key.equals("бегун") || key.equals("пробежка")) {
            return "бег";
        }
        return raw.trim();
    }

    public static boolean containsIgnoreCase(String haystack, String needle) {
        if (needle == null || needle.isBlank()) {
            return true;
        }
        if (haystack == null) {
            return false;
        }
        return normalizeKey(haystack).contains(normalizeKey(needle));
    }
}
