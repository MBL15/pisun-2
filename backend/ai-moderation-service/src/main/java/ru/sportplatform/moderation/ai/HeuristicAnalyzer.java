package ru.sportplatform.moderation.ai;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import ru.sportplatform.common.enums.Audience;
import ru.sportplatform.common.util.TextUtils;

/**
 * Встроенный модератор на правилах. Работает без внешних сервисов и ключей, поэтому проверка
 * гарантированно выполняется на любой машине эксперта. Шаблоны используют границы слов,
 * чтобы не срабатывать на «выставка», «подножка», «контактный телефон» и т.п.
 */
@Component
public class HeuristicAnalyzer {

    private record Category(String title, boolean forComments, List<Pattern> patterns) {
    }

    private static final int FLAGS = Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE | Pattern.UNICODE_CHARACTER_CLASS;

    private static final List<Category> FORBIDDEN = List.of(
            category("Азартные игры и ставки", true,
                    "\\bставк\\w*", "\\bставим\\b", "на деньги", "\\bбукмекер\\w*", "\\bтотализатор\\w*", "\\bказино\\b"),
            category("Алкоголь", false,
                    "\\bалкогол\\w*", "\\bпив(о|а|ом|у|ко)\\b", "\\bводк\\w*", "\\bвино\\b", "\\bшампанск\\w*",
                    "\\bбух(ать|аем|нем|ло)\\b"),
            category("Наркотические вещества", true,
                    "\\bнаркот\\w*", "\\bзакладк\\w*", "\\bспайс\\w*", "\\bтравк[аиу]\\b"),
            category("Оружие и насилие", true,
                    "\\bоружи\\w*", "\\bпистолет\\w*", "\\bтравмат(ика|ы|ом)\\b", "бои без правил",
                    "\\bдрак(а|и|у|ой)\\b", "\\bизби(ть|ваем|ли)\\b", "\\bнож(ом|и|ей)?\\b"),
            category("Мошенничество и финансовые схемы", true,
                    "\\bпредоплат\\w*", "\\bинвестиц\\w*", "\\bкриптовалют\\w*", "\\bпассивн\\w* доход\\w*",
                    "переведите (деньги|на карту)", "\\bномер карты\\b", "\\bсетевой маркетинг\\b", "\\bбыстрый заработок\\b"),
            category("Запрос персональных данных", true,
                    "\\bснилс\\b", "\\bcvv\\b", "код из смс", "данные паспорта"),
            category("Нецензурная лексика", true,
                    "\\bх[уy][йяеию]\\w*", "\\bпизд\\w*", "\\b[её]б(ать|ан|ну|ал|ут|уч)\\w*", "\\bбля(дь|ть|ха)?\\b",
                    "\\bсук[аи]\\b", "\\bмуда[кч]\\w*", "\\bгандон\\w*"),
            category("Дискриминация и экстремизм", true,
                    "только для (русских|славян|своих по крови)", "\\bнацист\\w*", "\\bэкстремизм\\w*", "\\bзиг\\w* хайл\\w*")
    );

    private static final List<Pattern> ADULT_MARKERS = compile(
            "18\\s*\\+", "только (для )?взрослы\\w*", "\\bбар\\b", "\\bночн(ой|ая|ое|ые)\\b", "\\bспарринг\\w*",
            "\\bединоборств\\w*", "\\bконтактн\\w* (игр|бо|спорт)\\w*", "\\bсауна\\b");

    private static final List<Pattern> KIDS_MARKERS = compile(
            "\\bдет(и|ей|ям|ский|ская|ское|ские)\\b", "\\bребён\\w*", "\\bребен\\w*", "\\bшкольник\\w*", "\\bсемейн\\w*",
            "\\bподрост\\w*");

    /** Жёсткая блокировка: публикация запрещена, без очереди на проверку администратором. */
    private static final List<String> HARD_BLOCK_WORDS = List.of(
            "секс", "sex", "xxx",
            "сиськ", "письк",
            "порно", "porno", "porn",
            "эротик", "проститу");

    private static final Pattern CONTACT_IN_TEXT = Pattern.compile("(\\+7|8)[\\s(-]*\\d{3}|t\\.me/|https?://|@\\w{4,}", FLAGS);
    private static final Pattern LINK = Pattern.compile("https?://|t\\.me/|www\\.", FLAGS);

    public HeuristicResult analyzeEvent(String title, String description, String conditions, Audience audience,
                                        LocalDateTime startAt, String customStopWords) {
        String text = String.join("\n", nz(title), nz(description), nz(conditions));
        Set<String> blockHits = hardBlockHits(text);
        List<String> blocked = blockHits.isEmpty() ? List.of()
                : List.of("Запрещённые слова: " + quote(blockHits));

        List<String> flagged = new ArrayList<>();
        for (Category category : FORBIDDEN) {
            Set<String> hits = matches(category.patterns(), text);
            if (!hits.isEmpty()) {
                flagged.add(category.title() + ": " + quote(hits));
            }
        }
        Set<String> stopHits = customStopWordHits(text, customStopWords);
        if (!stopHits.isEmpty()) {
            flagged.add("Стоп-слова администратора: " + quote(stopHits));
        }

        List<String> adult = new ArrayList<>();
        if (audience == Audience.ADULTS) {
            adult.add("Организатор указал аудиторию «Взрослые»");
        }
        Set<String> adultHits = matches(ADULT_MARKERS, text);
        if (!adultHits.isEmpty()) {
            adult.add("Взрослый формат: " + quote(adultHits));
        }
        if (startAt != null && (startAt.getHour() >= 22 || startAt.getHour() < 6)) {
            adult.add(String.format("Позднее время: начало в %02d:%02d", startAt.getHour(), startAt.getMinute()));
        }

        List<String> kids = new ArrayList<>();
        if (audience == Audience.KIDS) {
            kids.add("Организатор указал аудиторию «Дети»");
        }
        Set<String> kidsHits = matches(KIDS_MARKERS, text);
        if (!kidsHits.isEmpty()) {
            kids.add("Детский/семейный формат: " + quote(kidsHits));
        }

        List<String> recommendations = new ArrayList<>();
        if (nz(description).trim().length() < 40) {
            recommendations.add("Добавьте подробностей в описание: что будет происходить и для какого уровня подготовки");
        }
        if (TextUtils.isBlank(conditions)) {
            recommendations.add("Укажите условия участия: инвентарь, форма одежды, стоимость");
        }
        if (isShouting(title)) {
            recommendations.add("Уберите КАПС и лишние восклицательные знаки из названия — так событие выглядит надёжнее");
        }
        if (CONTACT_IN_TEXT.matcher(nz(description)).find()) {
            recommendations.add("Телефон и ссылки лучше перенести в поле «Информация для участников» — её увидят только подтверждённые участники");
        }
        return new HeuristicResult(flagged, blocked, adult, kids, recommendations);
    }

    public List<String> analyzeComment(String text, String customStopWords) {
        List<String> flagged = new ArrayList<>();
        for (Category category : FORBIDDEN) {
            if (!category.forComments()) {
                continue;
            }
            Set<String> hits = matches(category.patterns(), text);
            if (!hits.isEmpty()) {
                flagged.add(category.title());
            }
        }
        if (!customStopWordHits(text, customStopWords).isEmpty()) {
            flagged.add("Стоп-слова администратора");
        }
        Matcher links = LINK.matcher(nz(text));
        int linkCount = 0;
        while (links.find()) {
            linkCount++;
        }
        if (linkCount > 2) {
            flagged.add("Похоже на спам: много ссылок");
        }
        return flagged;
    }

    private static Set<String> matches(List<Pattern> patterns, String text) {
        Set<String> hits = new LinkedHashSet<>();
        for (Pattern pattern : patterns) {
            Matcher matcher = pattern.matcher(text);
            while (matcher.find() && hits.size() < 5) {
                hits.add(matcher.group().toLowerCase());
            }
        }
        return hits;
    }

    private static Set<String> hardBlockHits(String text) {
        String normalized = TextUtils.normalizeKey(text);
        Set<String> hits = new LinkedHashSet<>();
        for (String word : HARD_BLOCK_WORDS) {
            if (normalized.contains(word)) {
                hits.add(word);
            }
        }
        return hits;
    }

    private static Set<String> customStopWordHits(String text, String customStopWords) {
        Set<String> hits = new LinkedHashSet<>();
        if (TextUtils.isBlank(customStopWords)) {
            return hits;
        }
        String normalized = TextUtils.normalizeKey(text);
        Arrays.stream(customStopWords.split("[,;\\n]"))
                .map(TextUtils::normalizeKey)
                .filter(word -> word.length() >= 2)
                .filter(normalized::contains)
                .forEach(hits::add);
        return hits;
    }

    private static boolean isShouting(String title) {
        if (title == null) {
            return false;
        }
        long letters = title.chars().filter(Character::isLetter).count();
        long upper = title.chars().filter(Character::isUpperCase).count();
        return title.contains("!!!") || (letters >= 8 && upper * 1.0 / letters > 0.7);
    }

    private static String quote(Set<String> hits) {
        return "«" + String.join("», «", hits) + "»";
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }

    private static Category category(String title, boolean forComments, String... regexes) {
        return new Category(title, forComments, compile(regexes));
    }

    private static List<Pattern> compile(String... regexes) {
        return Arrays.stream(regexes).map(r -> Pattern.compile(r, FLAGS)).toList();
    }

    public record HeuristicResult(
            List<String> flagged,
            List<String> blockedReasons,
            List<String> adultReasons,
            List<String> kidsReasons,
            List<String> recommendations
    ) {
        public boolean isFlagged() {
            return !flagged.isEmpty();
        }

        public boolean isHardBlocked() {
            return !blockedReasons.isEmpty();
        }

        public boolean isAdultOnly() {
            return isHardBlocked() || isFlagged() || !adultReasons.isEmpty();
        }
    }
}
