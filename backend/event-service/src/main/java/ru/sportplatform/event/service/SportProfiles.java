package ru.sportplatform.event.service;

import ru.sportplatform.common.catalog.SportLexicon;
import ru.sportplatform.common.catalog.SportLexicon.Entry;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.event.domain.SportType;

/** Короткая карточка вида спорта: описание, экипировка, безопасность и длительность. */
public final class SportProfiles {

    private SportProfiles() {
    }

    public static void apply(SportType sport) {
        Entry known = SportLexicon.find(sport.getName());
        if (known != null) {
            if (TextUtils.isBlank(sport.getEmoji()) || "🏅".equals(sport.getEmoji())) {
                sport.setEmoji(known.emoji());
            }
            if (TextUtils.isBlank(sport.getCategory())) {
                sport.setCategory(known.category());
            }
            if (TextUtils.isBlank(sport.getIcon())) {
                sport.setIcon(known.icon());
            }
            if (TextUtils.isBlank(sport.getDefaultAge())) {
                sport.setDefaultAge(known.defaultAge());
            }
        }
        if (TextUtils.isBlank(sport.getCategory())) {
            sport.setCategory(guessCategory(sport.getName()));
        }
        if (TextUtils.isBlank(sport.getIcon())) {
            sport.setIcon(iconFor(sport.getCategory()));
        }
        if (TextUtils.isBlank(sport.getDefaultAge())) {
            sport.setDefaultAge(adult(sport.getName()) ? "ADULT_ONLY" : "CHILD_SAFE");
        }
        if (TextUtils.isBlank(sport.getTags())) {
            sport.setTags(tags(sport.getCategory(), sport.getDefaultAge()));
        }
        if (TextUtils.isBlank(sport.getDescription())) {
            sport.setDescription(describe(sport.getName(), sport.getCategory()));
        }
        if (TextUtils.isBlank(sport.getEquipment())) {
            sport.setEquipment(equipment(sport.getName(), sport.getCategory()));
        }
        if (TextUtils.isBlank(sport.getSafetyNotes())) {
            sport.setSafetyNotes(safety(sport.getDefaultAge()));
        }
        if (sport.getTypicalDurationMinutes() == null) {
            sport.setTypicalDurationMinutes(duration(sport.getCategory(), sport.getName()));
        }
        if (TextUtils.isBlank(sport.getEmoji())) {
            sport.setEmoji("🏅");
        }
    }

    private static String guessCategory(String name) {
        String key = TextUtils.normalizeKey(name);
        if (key.contains("шахмат") || key.contains("шашк") || key.contains("го ") || key.equals("го")) {
            return "интеллектуальный";
        }
        if (key.contains("двор") || key.contains("лапта") || key.contains("городк") || key.contains("зарядк")) {
            return "дворовый";
        }
        if (key.contains("футбол") || key.contains("баскет") || key.contains("волейбол") || key.contains("хоккей")) {
            return "командный";
        }
        return "индивидуальный";
    }

    private static String iconFor(String category) {
        return switch (category == null ? "" : category) {
            case "командный" -> "Users";
            case "дворовый" -> "Activity";
            case "интеллектуальный" -> "Crown";
            default -> "Footprints";
        };
    }

    private static boolean adult(String name) {
        String key = TextUtils.normalizeKey(name);
        return key.contains("бокс") || key.contains("борьб") || key.contains("стрельб") || key.contains("самбо")
                || key.contains("автомоб") || key.contains("мма") || key.contains("единобор");
    }

    private static String tags(String category, String age) {
        String ageTag = "ADULT_ONLY".equals(age) ? "#18+" : "#дети";
        return switch (category == null ? "" : category) {
            case "командный" -> "#команда " + ageTag;
            case "дворовый" -> "#двор #без_инвентаря " + ageTag;
            case "интеллектуальный" -> "#интеллект " + ageTag;
            default -> "#индивидуально " + ageTag;
        };
    }

    private static String describe(String name, String category) {
        return switch (category == null ? "" : category) {
            case "командный" -> name + " — командная игра. Нужны соперники и площадка, уровень может быть любительским.";
            case "дворовый" -> name + " — занятие во дворе или парке, обычно без сложного инвентаря и с детьми.";
            case "интеллектуальный" -> name + " — спокойное занятие за столом. Подходит разным возрастам, инвентарь часто общий.";
            default -> name + " — индивидуальное занятие. Темп выбираете сами, компанию можно найти рядом с домом.";
        };
    }

    private static String equipment(String name, String category) {
        String key = TextUtils.normalizeKey(name);
        if (key.contains("шахмат") || key.contains("шашк")) {
            return "Доска и фигуры. Если своих нет, обычно хватает одного комплекта на пару.";
        }
        if (key.contains("плаван")) {
            return "Купальник, шапочка, сланцы и полотенце.";
        }
        if (key.contains("бег") || key.contains("ходьб") || key.contains("легк")) {
            return "Беговые кроссовки, вода и одежда по погоде.";
        }
        if (key.contains("лыж") || key.contains("сноуборд") || key.contains("коньк") || key.contains("биатлон")) {
            return "Сезонная экипировка и тёплая одежда. Инвентарь можно взять напрокат, если организатор предупредил.";
        }
        if ("командный".equals(category)) {
            return "Форма или две футболки разного цвета, удобная обувь и вода. Мяч часто приносит организатор.";
        }
        if ("дворовый".equals(category)) {
            return "Удобная одежда и вода. Специальный инвентарь обычно не нужен.";
        }
        return "Удобная одежда, обувь и вода.";
    }

    private static String safety(String age) {
        if ("ADULT_ONLY".equals(age)) {
            return "Занятие для взрослых. Нужна разминка и трезвая оценка своих сил. Детям участвовать нельзя.";
        }
        return "Можно с детьми. Малышам лучше прийти со взрослым, начать с разминки и не оставлять их одних у площадки.";
    }

    private static int duration(String category, String name) {
        String key = TextUtils.normalizeKey(name);
        if (key.contains("шахмат") || key.contains("шашк")) {
            return 120;
        }
        if ("командный".equals(category)) {
            return 90;
        }
        if (key.contains("бег") || key.contains("плаван")) {
            return 60;
        }
        return 90;
    }
}
