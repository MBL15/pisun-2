package ru.sportplatform.moderation.ai;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import ru.sportplatform.common.dto.AgentSuggestion;
import ru.sportplatform.common.dto.EventVerificationRequest;
import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.moderation.ai.HeuristicAnalyzer.HeuristicResult;

@Component
public class EventQualityGuardian {

    private static final Pattern PHONE = Pattern.compile("(\\+7|8)[\\s(-]*\\d{3}", Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
    private static final Pattern URL = Pattern.compile("https?://|t\\.me/", Pattern.CASE_INSENSITIVE);

    public List<AgentSuggestion> suggestions(EventVerificationRequest request, HeuristicResult heuristic, AgeRestriction age) {
        List<AgentSuggestion> out = new ArrayList<>();
        for (String tip : heuristic.recommendations()) {
            out.add(new AgentSuggestion("INFO", fieldForRecommendation(tip), tip, 0.75, false));
        }
        String description = nz(request.description());
        String conditions = nz(request.conditions());
        if (!TextUtils.isBlank(description) && !containsAddressHint(description) && TextUtils.isBlank(request.conditions())) {
            out.add(new AgentSuggestion("WARNING", "description",
                    "В описании нет адреса или ориентира — добавьте их в поле «Место» или уточните в тексте.", 0.8, false));
        }
        if (PHONE.matcher(description + "\n" + conditions).find()) {
            out.add(new AgentSuggestion("WARNING", "description",
                    "Контакт в свободной форме — лучше указать телефон или мессенджер в поле «Контакты организатора».", 0.85, false));
        }
        if (URL.matcher(description).find()) {
            out.add(new AgentSuggestion("INFO", "description",
                    "Ссылка в описании допустима, но проверьте, что она не ведёт на оплату или сторонние сервисы.", 0.6, false));
        }
        if (!TextUtils.isBlank(request.equipment()) && !mentionsEquipment(description + " " + conditions, request.equipment())) {
            out.add(new AgentSuggestion("WARNING", "conditions",
                    "В тексте упомянут инвентарь, но поле условий может не совпадать — проверьте формулировку «Что взять».", 0.7, false));
        }
        if (TextUtils.isBlank(conditions) && mentionsEquipmentWords(description)) {
            out.add(new AgentSuggestion("WARNING", "conditions",
                    "В описании есть требования к экипировке — продублируйте их в блоке «Условия участия».", 0.82, false));
        }
        sportMismatch(request, out);
        if (age == AgeRestriction.CHILD_SAFE) {
            out.add(new AgentSuggestion("INFO", "audience",
                    "Прогноз допуска: подходит для детей (CHILD_SAFE) — по маркерам в тексте и аудитории.", 0.9, false));
        } else {
            out.add(new AgentSuggestion("INFO", "audience",
                    "Прогноз допуска: только для взрослых (ADULT_ONLY) — проверьте возраст участников.", 0.9, false));
        }
        return out;
    }

    public List<String> descriptionVariants(EventVerificationRequest request) {
        String title = nz(request.title()).trim();
        String place = nz(request.description()).lines().findFirst().orElse("").trim();
        if (title.isEmpty()) {
            return List.of();
        }
        String base = title.endsWith(".") ? title : title + ".";
        List<String> variants = new ArrayList<>();
        variants.add(base + " Сбор за 15 минут до начала. Возьмите удобную форму и воду.");
        if (!place.isEmpty()) {
            variants.add(base + " Место: " + place + ". Запись через платформу — так организатор видит число участников.");
        } else {
            variants.add(base + " Подробности по месту и экипировке — в карточке события. Задайте вопрос в обсуждении.");
        }
        return variants.stream().limit(3).toList();
    }

    private void sportMismatch(EventVerificationRequest request, List<AgentSuggestion> out) {
        if (TextUtils.isBlank(request.sportName()) || TextUtils.isBlank(request.description())) {
            return;
        }
        String sport = request.sportName().toLowerCase(Locale.ROOT);
        String text = request.description().toLowerCase(Locale.ROOT);
        if (sport.contains("бег") && text.contains("шахмат")) {
            out.add(new AgentSuggestion("FLAG", "sportType",
                    "Вы выбрали «" + request.sportName() + "», но в описании упомянуты шахматы — проверьте направление.", 0.92, false));
        } else if (sport.contains("шахмат") && (text.contains("футбол") || text.contains("мяч"))) {
            out.add(new AgentSuggestion("FLAG", "sportType",
                    "Похоже на несоответствие вида спорта и описания — уточните направление.", 0.88, false));
        }
    }

    private static String fieldForRecommendation(String tip) {
        if (tip.toLowerCase(Locale.ROOT).contains("назван")) {
            return "title";
        }
        if (tip.toLowerCase(Locale.ROOT).contains("услов")) {
            return "conditions";
        }
        return "description";
    }

    private static boolean containsAddressHint(String text) {
        String low = text.toLowerCase(Locale.ROOT);
        return low.contains("ул.") || low.contains("улиц") || low.contains("двор") || low.contains("парк")
                || low.contains("стадион") || low.contains("адрес");
    }

    private static boolean mentionsEquipmentWords(String text) {
        String low = text.toLowerCase(Locale.ROOT);
        return low.contains("мяч") || low.contains("форма") || low.contains("инвентар") || low.contains("обув")
                || low.contains("палк") || low.contains("шлем");
    }

    private static boolean mentionsEquipment(String text, String equipment) {
        String[] parts = equipment.toLowerCase(Locale.ROOT).split("[,;\\s]+");
        for (String part : parts) {
            if (part.length() > 3 && text.toLowerCase(Locale.ROOT).contains(part)) {
                return true;
            }
        }
        return false;
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }
}
