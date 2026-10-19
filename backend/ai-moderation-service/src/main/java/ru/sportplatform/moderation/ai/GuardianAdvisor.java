package ru.sportplatform.moderation.ai;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import ru.sportplatform.common.catalog.SportLexicon;
import ru.sportplatform.common.dto.AgentSuggestion;
import ru.sportplatform.common.dto.EventVerificationRequest;
import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.Audience;
import ru.sportplatform.common.util.TextUtils;

/**
 * Подсказки Хранителя качества. Эвристики выполняются всегда, вердикт не подменяют:
 * детские события с нарушениями по-прежнему решает {@code HeuristicAnalyzer}.
 */
@Component
public class GuardianAdvisor {

    private static final int FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.UNICODE_CHARACTER_CLASS;

    private static final Pattern PHONE_OR_LINK = Pattern.compile(
            "(\\+7|8)[\\s(-]*\\d{3}|t\\.me/|https?://|www\\.", FLAGS);
    private static final Pattern EMOJI = Pattern.compile("[\\p{So}\\p{Cn}]|[⚽🏀🏐🎾🏓🏊🚴🏃🤸🧘♟️🏅🥊🎿]");
    private static final Pattern AGE_RANGE = Pattern.compile("\\d+\\s*(\\+|лет)|возраст|от\\s+\\d+|\\d+\\s*[–-]\\s*\\d+", FLAGS);
    private static final Pattern EQUIPMENT = Pattern.compile(
            "сво(им|ю|й|ими)\\s+\\w+|мяч|ракетк|кроссовк|форм[уыа]|коврик|палк|инвентар|шахмат|доск", FLAGS);
    private static final Pattern PRICE = Pattern.compile("\\d+\\s*(₽|руб)|взнос|платн|стоит\\s+\\d+", FLAGS);
    private static final Pattern FREE = Pattern.compile("бесплатн", FLAGS);
    private static final Pattern CHILD_TRIGGER = Pattern.compile(
            "\\bалкогол\\w*|\\bпив(о|а|ом)\\b|18\\s*\\+|без родителей|только для взрослых", FLAGS);
    private static final Pattern KIDS_WORD = Pattern.compile(
            "для всей семьи|семейн\\w*|семь(ёй|ей|я|и|е)|дет(и|ей|ям|ск)\\w*|ребён\\w*|ребен\\w*|школьник\\w*|\\bдвор(е|а|у|ом|ах)?\\b|\\d+\\s*лет|\\d+\\s*\\+", FLAGS);

    public List<AgentSuggestion> suggestions(EventVerificationRequest request, AgeRestriction age) {
        List<AgentSuggestion> list = new ArrayList<>();
        String description = nz(request.description());
        String conditions = nz(request.conditions());
        String title = nz(request.title());
        String text = title + "\n" + description;

        if (TextUtils.isBlank(request.description()) || description.length() < 40) {
            list.add(hint("SHORT_DESCRIPTION", "description",
                    "Описание короткое. Добавьте, что будете делать, для кого занятие и что взять с собой.", 0.9));
        }
        if (PHONE_OR_LINK.matcher(text).find() && TextUtils.isBlank(request.conditions())) {
            list.add(hint("PHONE_IN_TEXT", "organizerContact",
                    "Контакт указан в свободном тексте. Перенесите телефон или ссылку в поле «Контакты» — его увидят только записавшиеся.",
                    0.86));
        }
        if (EMOJI.matcher(title).find()) {
            list.add(hint("EMOJI_TITLE", "title",
                    "В названии есть эмодзи — это нормально, проверьте, что название читается и без них.", 0.55));
        }
        boolean kids = request.audience() == Audience.KIDS || KIDS_WORD.matcher(text).find()
                || age == AgeRestriction.CHILD_SAFE;
        if (kids && !AGE_RANGE.matcher(description + "\n" + conditions).find()) {
            list.add(hint("AGE_RANGE", "description",
                    "Похоже на занятие для детей, но возрастной диапазон не указан. Допишите, например: «с 6 лет, можно с родителями».",
                    0.8));
        }
        if (EQUIPMENT.matcher(description).find() && conditions.length() < 12) {
            list.add(hint("INCONSISTENT", "conditions",
                    "В описании упомянут инвентарь, а поле «Условия участия» пустое. Перенесите туда, что нужно взять с собой.",
                    0.84));
        }
        if (PRICE.matcher(description).find() && !PRICE.matcher(conditions).find() && !FREE.matcher(text + conditions).find()) {
            list.add(hint("INCONSISTENT", "conditions",
                    "В тексте есть цена или взнос, а в условиях этого нет. Укажите стоимость в поле условий, чтобы её не пропустили.",
                    0.82));
        }
        if (age == AgeRestriction.CHILD_SAFE && CHILD_TRIGGER.matcher(text + "\n" + conditions).find()) {
            list.add(new AgentSuggestion("CHILD_TRIGGER", "description",
                    "Для детского занятия найдены слова про алкоголь, 18+ или «без родителей». Уберите их или смените аудиторию на взрослых.",
                    0.93, false));
        }
        mismatch(request.sportName(), description).ifPresent(list::add);
        return list;
    }

    public String ageExplanation(EventVerificationRequest request, AgeRestriction age, boolean adultMarkers) {
        String text = (nz(request.title()) + " " + nz(request.description()) + " " + nz(request.conditions())).toLowerCase(Locale.ROOT);
        List<String> found = new ArrayList<>();
        var kids = KIDS_WORD.matcher(text);
        while (kids.find()) {
            String hit = "«" + kids.group().trim() + "»";
            if (!found.contains(hit)) {
                found.add(hit);
            }
        }
        if (request.audience() == Audience.KIDS) {
            found.add("аудитория «Дети»");
        }
        if (request.audience() == Audience.ADULTS) {
            found.add("аудитория «Взрослые»");
        }
        if (adultMarkers) {
            found.add("взрослые маркеры");
        }
        String why = found.isEmpty() ? "явных возрастных маркеров нет, ориентируемся на аудиторию и время" : String.join(", ", found);
        if (age == AgeRestriction.CHILD_SAFE) {
            return "Прогноз: можно с детьми. Найдено: " + why + ".";
        }
        return "Прогноз: 18+. Найдено: " + why + ".";
    }

    /** 2–3 варианта текста. Ничего не сохраняет — только черновики для организатора. */
    public List<String> rewrites(String title, String description, String conditions, String sport, String address) {
        String sportName = TextUtils.isBlank(sport) ? "занятие" : sport.toLowerCase(Locale.ROOT);
        String place = TextUtils.isBlank(address) ? "укажите место встречи" : address.trim();
        String body = TextUtils.isBlank(description) ? "Коротко расскажите, что будете делать" : stripContacts(description.trim());
        String gear = TextUtils.isBlank(conditions) ? "Возьмите удобную одежду и воду." : conditions.trim();
        List<String> variants = new ArrayList<>();
        variants.add("Приглашаем на " + sportName + ". " + body
                + " Встречаемся: " + place + ". " + gear);
        variants.add(capitalize(sportName) + ": " + firstSentence(body)
                + " Подойдёт тем, кто хочет компанию рядом с домом. Что взять: " + gear);
        variants.add("Собираемся на " + sportName + " — " + place + ". " + firstSentence(body)
                + " Если идёте впервые, напишите об этом в заявке.");
        return variants.stream().map(this::tidy).distinct().limit(3).toList();
    }

    private java.util.Optional<AgentSuggestion> mismatch(String sportName, String description) {
        if (TextUtils.isBlank(sportName) || TextUtils.isBlank(description)) {
            return java.util.Optional.empty();
        }
        String selected = TextUtils.normalizeKey(sportName);
        String text = TextUtils.normalizeKey(description);
        if (text.contains(selected)) {
            return java.util.Optional.empty();
        }
        String mentioned = null;
        for (String name : SportLexicon.names()) {
            String key = TextUtils.normalizeKey(name);
            if (key.length() < 4 || key.equals(selected)) {
                continue;
            }
            if (containsWord(text, key) && !selected.contains(key) && !key.contains(selected)) {
                mentioned = name;
                break;
            }
        }
        if (mentioned == null) {
            return java.util.Optional.empty();
        }
        return java.util.Optional.of(new AgentSuggestion("SPORT_MISMATCH", "sport",
                "Вы выбрали «" + sportName.trim() + "», а в тексте упоминается «" + mentioned
                        + "». Проверьте направление — куратор справочника может подсказать замену.",
                0.78, false));
    }

    private static boolean containsWord(String text, String word) {
        int from = 0;
        while (from <= text.length() - word.length()) {
            int at = text.indexOf(word, from);
            if (at < 0) {
                return false;
            }
            boolean left = at == 0 || !Character.isLetter(text.charAt(at - 1));
            int end = at + word.length();
            boolean right = end >= text.length() || !Character.isLetter(text.charAt(end));
            if (left && right) {
                return true;
            }
            from = at + 1;
        }
        return false;
    }

    private static AgentSuggestion hint(String type, String field, String message, double confidence) {
        return new AgentSuggestion(type, field, message, confidence, false);
    }

    private String stripContacts(String value) {
        return PHONE_OR_LINK.matcher(value).replaceAll("").replaceAll("\\s{2,}", " ").trim();
    }

    private String firstSentence(String value) {
        int dot = value.indexOf('.');
        if (dot > 20 && dot < 220) {
            return value.substring(0, dot + 1);
        }
        return value.length() > 220 ? value.substring(0, 220).trim() + "…" : value;
    }

    private String tidy(String value) {
        return value.replaceAll("\\s{2,}", " ").replace(" .", ".").trim();
    }

    private static String capitalize(String value) {
        if (value.isEmpty()) {
            return value;
        }
        return value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1);
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }
}
