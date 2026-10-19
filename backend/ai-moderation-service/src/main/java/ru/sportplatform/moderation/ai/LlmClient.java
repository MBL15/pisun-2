package ru.sportplatform.moderation.ai;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.extern.slf4j.Slf4j;
import ru.sportplatform.common.dto.EventVerificationRequest;
import ru.sportplatform.common.util.TextUtils;

/** Клиент любого OpenAI-совместимого Chat Completions API. Без ключа не используется. */
@Slf4j
@Component
public class LlmClient {

    private static final String SYSTEM_PROMPT = """
            Ты модератор российской платформы совместных спортивных активностей для людей всех возрастов.
            Проверь объявление о мероприятии. Помечай (flagged=true) только явные нарушения: азартные игры и ставки,
            алкоголь и наркотики, насилие и оружие, мошенничество, сбор персональных данных, мат, дискриминацию,
            не связанную со спортом рекламу. Обычные спортивные встречи нарушениями не считаются.
            childSafe=true, если ребёнок 7–14 лет может безопасно участвовать (возможно, с родителем).
            Ответь ТОЛЬКО JSON без пояснений:
            {"flagged": boolean, "childSafe": boolean, "summary": "одно-два предложения по-русски", "reasons": ["..."]}
            """;

    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String model;
    private final RestClient client;

    public LlmClient(ObjectMapper objectMapper,
                     RestClient.Builder builder,
                     @Value("${ai.llm.api-key:}") String apiKey,
                     @Value("${ai.llm.base-url}") String baseUrl,
                     @Value("${ai.llm.model}") String model,
                     @Value("${ai.llm.timeout-seconds:10}") int timeoutSeconds) {
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.model = model;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        this.client = builder.clone().baseUrl(baseUrl).requestFactory(factory).build();
    }

    public boolean isConfigured() {
        return !TextUtils.isBlank(apiKey);
    }

    public String model() {
        return model;
    }

    public Optional<List<String>> rewriteVariants(String title, String description, String sport) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            JsonNode json = complete("""
                    Перепиши описание спортивного мероприятия по-русски. Не добавляй контакты, цены и факты, которых нет в тексте.
                    Верни ТОЛЬКО JSON: {"variants":["вариант 1","вариант 2","вариант 3"]}
                    """, "Название: " + nz(title) + "\nВид спорта: " + nz(sport) + "\nОписание: " + nz(description));
            if (json == null || !json.path("variants").isArray()) {
                return Optional.empty();
            }
            List<String> variants = new ArrayList<>();
            json.path("variants").forEach(node -> {
                if (!node.asText("").isBlank()) {
                    variants.add(node.asText());
                }
            });
            return variants.isEmpty() ? Optional.empty() : Optional.of(variants.stream().limit(3).toList());
        } catch (Exception e) {
            log.warn("LLM rewrite failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /** Оценка свободного названия вида спорта. Пустой ответ — остаёмся на эвристике. */
    public Optional<SportCuration> curateSport(String name, String description) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            JsonNode json = complete("""
                    Ты куратор справочника видов спорта. Реши, похоже ли название на реальный спорт или подвижную активность.
                    Откажи (adequate=false), если это оскорбление, реклама, наркотики, азарт или бессмыслица.
                    category: командный, индивидуальный, дворовый или интеллектуальный.
                    Верни ТОЛЬКО JSON: {"adequate":true,"canonicalName":"...","category":"...","childSafe":true,"reason":"..."}
                    """, "Название: " + nz(name) + "\nОписание: " + nz(description));
            if (json == null || !json.has("adequate")) {
                return Optional.empty();
            }
            return Optional.of(new SportCuration(json.path("adequate").asBoolean(false),
                    json.path("canonicalName").asText(name),
                    json.path("category").asText("индивидуальный"),
                    json.path("childSafe").asBoolean(true),
                    json.path("reason").asText("")));
        } catch (Exception e) {
            log.warn("LLM sport curation failed: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public Optional<LlmVerdict> verify(EventVerificationRequest request) {
        if (!isConfigured()) {
            return Optional.empty();
        }
        try {
            String userContent = objectMapper.writeValueAsString(Map.of(
                    "title", nz(request.title()),
                    "description", nz(request.description()),
                    "conditions", nz(request.conditions()),
                    "sport", nz(request.sportName()),
                    "audience", request.audience() == null ? "ALL" : request.audience().name(),
                    "startAt", request.startAt() == null ? "" : request.startAt().toString()));
            Map<String, Object> body = Map.of(
                    "model", model,
                    "temperature", 0,
                    "messages", List.of(
                            Map.of("role", "system", "content", SYSTEM_PROMPT),
                            Map.of("role", "user", "content", userContent)));

            JsonNode response = client.post().uri("/chat/completions")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);
            String content = response == null ? null : response.path("choices").path(0).path("message").path("content").asText(null);
            return Optional.ofNullable(parse(content));
        } catch (Exception e) {
            log.warn("LLM moderation failed, heuristic verdict will be used: {}", e.getMessage());
            return Optional.empty();
        }
    }

    private JsonNode complete(String system, String user) throws Exception {
        Map<String, Object> body = Map.of(
                "model", model,
                "temperature", 0,
                "messages", List.of(
                        Map.of("role", "system", "content", system),
                        Map.of("role", "user", "content", user)));
        JsonNode response = client.post().uri("/chat/completions")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(JsonNode.class);
        String content = response == null ? null : response.path("choices").path(0).path("message").path("content").asText(null);
        if (content == null) {
            return null;
        }
        int start = content.indexOf('{');
        int end = content.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return null;
        }
        return objectMapper.readTree(content.substring(start, end + 1));
    }

    private LlmVerdict parse(String content) throws Exception {
        if (content == null) {
            return null;
        }
        int start = content.indexOf('{');
        int end = content.lastIndexOf('}');
        if (start < 0 || end <= start) {
            return null;
        }
        JsonNode json = objectMapper.readTree(content.substring(start, end + 1));
        List<String> reasons = json.path("reasons").isArray()
                ? objectMapper.convertValue(json.path("reasons"), objectMapper.getTypeFactory().constructCollectionType(List.class, String.class))
                : List.of();
        return new LlmVerdict(json.path("flagged").asBoolean(false), json.path("childSafe").asBoolean(true),
                json.path("summary").asText(""), reasons);
    }

    private static String nz(String value) {
        return value == null ? "" : value;
    }

    public record LlmVerdict(boolean flagged, boolean childSafe, String summary, List<String> reasons) {
    }

    public record SportCuration(boolean adequate, String canonicalName, String category, boolean childSafe, String reason) {
    }
}
