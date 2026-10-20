package ru.sportplatform.common.policy;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

/** Жёсткий список запрещённых фрагментов (без LLM). */
public final class ProhibitedContentScanner {

    private static final int FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.UNICODE_CHARACTER_CLASS;

    private static final List<Pattern> INSTANT_BAN = List.of(
            Pattern.compile("секс", FLAGS),
            Pattern.compile("порн", FLAGS),
            Pattern.compile("дроч", FLAGS),
            Pattern.compile("мастурб", FLAGS),
            Pattern.compile("онан", FLAGS),
            Pattern.compile("гомо", FLAGS),
            Pattern.compile("пидор", FLAGS),
            Pattern.compile("педик", FLAGS),
            Pattern.compile("наркот", FLAGS),
            Pattern.compile("педоф", FLAGS));

    private ProhibitedContentScanner() {
    }

    public static List<String> instantBanHits(String... parts) {
        String text = normalize(parts);
        List<String> hits = new ArrayList<>();
        for (Pattern pattern : INSTANT_BAN) {
            if (pattern.matcher(text).find()) {
                hits.add(pattern.pattern());
            }
        }
        return hits;
    }

    public static boolean requiresInstantBan(String... parts) {
        return !instantBanHits(parts).isEmpty();
    }

    /** Фраза «коч братан» (в т.ч. через пробел/перенос между полями) — блокировка аккаунта. */
    public static boolean requiresInstantAccountBan(String... parts) {
        String text = normalize(parts);
        return text.contains("коч") && text.contains("братан");
    }

    public static boolean mentionsDroch(String... parts) {
        return normalize(parts).contains("дроч");
    }

    private static String normalize(String... parts) {
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (part != null && !part.isBlank()) {
                if (sb.length() > 0) {
                    sb.append('\n');
                }
                sb.append(part.trim());
            }
        }
        return sb.toString().toLowerCase(Locale.ROOT);
    }
}
