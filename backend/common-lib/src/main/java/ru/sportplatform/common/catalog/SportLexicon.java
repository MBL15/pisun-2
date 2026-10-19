package ru.sportplatform.common.catalog;

import java.util.ArrayList;
import java.util.List;

import ru.sportplatform.common.util.TextUtils;

/**
 * Основные виды спорта из Всероссийского реестра (приказ Минспорта, разделы признанных
 * и общероссийских видов). Дисциплины свёрнуты в одну категорию: вместо гонки, спринта,
 * масс-старта и эстафеты остаётся «Биатлон», вместо четырёх велоспортов — «Велоспорт».
 * Военно-прикладные и служебно-прикладные виды в открытый справочник не входят.
 */
public final class SportLexicon {

    public record Entry(String name, String emoji, String category, String defaultAge, String icon) {
    }

    private static final List<Entry> ENTRIES = parse("""
            Авиамодельный спорт|🛩️|индивидуальный|CHILD_SAFE|Plane
            Автомобильный спорт|🏎️|индивидуальный|ADULT_ONLY|Car
            Айкидо|🥋|индивидуальный|ADULT_ONLY|Swords
            Акробатический рок-н-ролл|💃|командный|CHILD_SAFE|Music
            Альпинизм|🧗|индивидуальный|ADULT_ONLY|Mountain
            Американский футбол|🏈|командный|ADULT_ONLY|Users
            Армрестлинг|💪|индивидуальный|ADULT_ONLY|Dumbbell
            Бадминтон|🏸|индивидуальный|CHILD_SAFE|CircleDot
            Баскетбол|🏀|командный|CHILD_SAFE|Users
            Бейсбол|⚾|командный|CHILD_SAFE|Users
            Бег|🏃|индивидуальный|CHILD_SAFE|Footprints
            Биатлон|🎿|индивидуальный|CHILD_SAFE|Target
            Бильярдный спорт|🎱|индивидуальный|ADULT_ONLY|CircleDot
            Бобслей|🛷|командный|ADULT_ONLY|Mountain
            Бодибилдинг|🏋️|индивидуальный|ADULT_ONLY|Dumbbell
            Бокс|🥊|индивидуальный|ADULT_ONLY|Swords
            Борьба на поясах|🤼|индивидуальный|ADULT_ONLY|Swords
            Боулинг|🎳|индивидуальный|CHILD_SAFE|CircleDot
            Велоспорт|🚴|индивидуальный|CHILD_SAFE|Bike
            Воднолыжный спорт|🎿|индивидуальный|CHILD_SAFE|Waves
            Водно-моторный спорт|🚤|индивидуальный|ADULT_ONLY|Waves
            Водное поло|🤽|командный|CHILD_SAFE|Users
            Волейбол|🏐|командный|CHILD_SAFE|Users
            Восточное боевое единоборство|🥋|индивидуальный|ADULT_ONLY|Swords
            Гандбол|🤾|командный|CHILD_SAFE|Users
            Гиревой спорт|🏋️|индивидуальный|ADULT_ONLY|Dumbbell
            Го|⚫|интеллектуальный|CHILD_SAFE|Crown
            Гольф|⛳|индивидуальный|CHILD_SAFE|CircleDot
            Горнолыжный спорт|⛷️|индивидуальный|CHILD_SAFE|Mountain
            Городошный спорт|🪵|дворовый|CHILD_SAFE|Activity
            Гребля на байдарках и каноэ|🛶|индивидуальный|CHILD_SAFE|Waves
            Гребной слалом|🛶|индивидуальный|CHILD_SAFE|Waves
            Гребной спорт|🚣|командный|CHILD_SAFE|Waves
            Дартс|🎯|индивидуальный|CHILD_SAFE|Target
            Джиу-джитсу|🥋|индивидуальный|ADULT_ONLY|Swords
            Дзюдо|🥋|индивидуальный|CHILD_SAFE|Swords
            Каратэ|🥋|индивидуальный|CHILD_SAFE|Swords
            Кёрлинг|🥌|командный|CHILD_SAFE|Users
            Кикбоксинг|🥊|индивидуальный|ADULT_ONLY|Swords
            Кинологический спорт|🐕|индивидуальный|CHILD_SAFE|PawPrint
            Компьютерный спорт|🎮|интеллектуальный|CHILD_SAFE|Gamepad2
            Конный спорт|🏇|индивидуальный|CHILD_SAFE|Trophy
            Конькобежный спорт|⛸️|индивидуальный|CHILD_SAFE|Footprints
            Кураш|🤼|индивидуальный|ADULT_ONLY|Swords
            Лакросс|🥍|командный|CHILD_SAFE|Users
            Лапта|🏏|дворовый|CHILD_SAFE|Activity
            Лёгкая атлетика|🏃|индивидуальный|CHILD_SAFE|Footprints
            Лыжные гонки|🎿|индивидуальный|CHILD_SAFE|Footprints
            Настольный теннис|🏓|индивидуальный|CHILD_SAFE|CircleDot
            Парусный спорт|⛵|командный|CHILD_SAFE|Waves
            Пауэрлифтинг|🏋️|индивидуальный|ADULT_ONLY|Dumbbell
            Плавание|🏊|индивидуальный|CHILD_SAFE|Waves
            Подводный спорт|🤿|индивидуальный|ADULT_ONLY|Waves
            Практическая стрельба|🎯|индивидуальный|ADULT_ONLY|Target
            Прыжки в воду|🤿|индивидуальный|CHILD_SAFE|Waves
            Прыжки на батуте|🤸|индивидуальный|CHILD_SAFE|Activity
            Прыжки на лыжах с трамплина|🎿|индивидуальный|ADULT_ONLY|Mountain
            Пулевая стрельба|🎯|индивидуальный|ADULT_ONLY|Target
            Радиоспорт|📻|индивидуальный|CHILD_SAFE|Radio
            Регби|🏉|командный|ADULT_ONLY|Users
            Роллер-спорт|🛼|индивидуальный|CHILD_SAFE|Footprints
            Рыболовный спорт|🎣|индивидуальный|CHILD_SAFE|Fish
            Самбо|🥋|индивидуальный|CHILD_SAFE|Swords
            Санный спорт|🛷|индивидуальный|CHILD_SAFE|Mountain
            Сёрфинг|🏄|индивидуальный|CHILD_SAFE|Waves
            Синхронное плавание|🏊|командный|CHILD_SAFE|Waves
            Скалолазание|🧗|индивидуальный|CHILD_SAFE|Mountain
            Сквош|🎾|индивидуальный|CHILD_SAFE|CircleDot
            Сноуборд|🏂|индивидуальный|CHILD_SAFE|Mountain
            Современное пятиборье|🤺|индивидуальный|CHILD_SAFE|Trophy
            Софтбол|🥎|командный|CHILD_SAFE|Users
            Спортивная акробатика|🤸|командный|CHILD_SAFE|Activity
            Спортивная аэробика|🤸|индивидуальный|CHILD_SAFE|Activity
            Спортивная борьба|🤼|индивидуальный|CHILD_SAFE|Swords
            Спортивная гимнастика|🤸|индивидуальный|CHILD_SAFE|Activity
            Спортивная йога|🧘|индивидуальный|CHILD_SAFE|Activity
            Спортивное ориентирование|🧭|индивидуальный|CHILD_SAFE|Map
            Спорт глухих|🏅|индивидуальный|CHILD_SAFE|Trophy
            Спорт лиц с поражением ОДА|🏅|индивидуальный|CHILD_SAFE|Trophy
            Спорт слепых|🏅|индивидуальный|CHILD_SAFE|Trophy
            Стендовая стрельба|🎯|индивидуальный|ADULT_ONLY|Target
            Стрельба из арбалета|🏹|индивидуальный|ADULT_ONLY|Target
            Стрельба из лука|🏹|индивидуальный|CHILD_SAFE|Target
            Сумо|🤼|индивидуальный|ADULT_ONLY|Swords
            Скандинавская ходьба|🚶|индивидуальный|CHILD_SAFE|Footprints
            Танцевальный спорт|💃|командный|CHILD_SAFE|Music
            Теннис|🎾|индивидуальный|CHILD_SAFE|CircleDot
            Триатлон|🏊|индивидуальный|ADULT_ONLY|Trophy
            Тхэквондо|🥋|индивидуальный|CHILD_SAFE|Swords
            Тяжёлая атлетика|🏋️|индивидуальный|ADULT_ONLY|Dumbbell
            Универсальный бой|🥊|индивидуальный|ADULT_ONLY|Swords
            Ушу|🥋|индивидуальный|CHILD_SAFE|Swords
            Фехтование|🤺|индивидуальный|CHILD_SAFE|Swords
            Фигурное катание на коньках|⛸️|индивидуальный|CHILD_SAFE|Trophy
            Фитнес-аэробика|🤸|индивидуальный|CHILD_SAFE|Activity
            Флорбол|🏑|командный|CHILD_SAFE|Users
            Фристайл|🎿|индивидуальный|ADULT_ONLY|Mountain
            Футбол|⚽|командный|CHILD_SAFE|Users
            Хоккей|🏒|командный|CHILD_SAFE|Users
            Хоккей на траве|🏑|командный|CHILD_SAFE|Users
            Хоккей с мячом|🏒|командный|CHILD_SAFE|Users
            Художественная гимнастика|🎀|индивидуальный|CHILD_SAFE|Activity
            Черлидинг|📣|командный|CHILD_SAFE|Users
            Шахматы|♟️|интеллектуальный|CHILD_SAFE|Crown
            Шашки|♟️|интеллектуальный|CHILD_SAFE|Crown
            Эстетическая гимнастика|🤸|командный|CHILD_SAFE|Activity
            """);

    private SportLexicon() {
    }

    public static List<Entry> all() {
        return ENTRIES;
    }

    public static List<String> names() {
        return ENTRIES.stream().map(Entry::name).toList();
    }

    public static Entry find(String name) {
        String key = TextUtils.normalizeKey(name);
        for (Entry entry : ENTRIES) {
            if (TextUtils.normalizeKey(entry.name()).equals(key)) {
                return entry;
            }
        }
        return null;
    }

    private static List<Entry> parse(String raw) {
        List<Entry> entries = new ArrayList<>();
        for (String line : raw.split("\n")) {
            String trimmed = line.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            String[] parts = trimmed.split("\\|");
            entries.add(new Entry(parts[0], parts[1], parts[2], parts[3], parts[4]));
        }
        return List.copyOf(entries);
    }
}
