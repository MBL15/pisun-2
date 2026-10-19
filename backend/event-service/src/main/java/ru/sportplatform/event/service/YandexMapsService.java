package ru.sportplatform.event.service;

import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import com.fasterxml.jackson.databind.JsonNode;

import lombok.extern.slf4j.Slf4j;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.util.TextUtils;

/**
 * Геокодер и маршрутизатор Яндекса. Ключи живут на сервере: у геокодера и маршрутов
 * маленькие суточные лимиты, поэтому браузер их не видит.
 */
@Slf4j
@Service
public class YandexMapsService {

    private final String geocoderKey;
    private final String routerKey;
    private final RestClient http;

    public YandexMapsService(@Value("${yandex.geocoder-key:}") String geocoderKey,
                             @Value("${yandex.router-key:}") String routerKey,
                             RestClient.Builder builder) {
        this.geocoderKey = geocoderKey;
        this.routerKey = routerKey;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(3));
        factory.setReadTimeout(Duration.ofSeconds(8));
        this.http = builder.clone().requestFactory(factory).build();
    }

    public List<GeoPlace> geocode(String query) {
        if (TextUtils.isBlank(query)) {
            throw ApiException.badRequest("Введите адрес, откуда или куда ехать");
        }
        if (TextUtils.isBlank(geocoderKey)) {
            throw ApiException.unavailable("Геокодер Яндекса не настроен. Укажите точку на карте кликом.");
        }
        String uri = UriComponentsBuilder
                .fromUriString("https://geocode-maps.yandex.ru/1.x/")
                .queryParam("apikey", geocoderKey)
                .queryParam("geocode", query.trim())
                .queryParam("format", "json")
                .queryParam("lang", "ru_RU")
                .queryParam("results", 5)
                .build()
                .encode()
                .toUriString();
        try {
            JsonNode root = http.get().uri(URI.create(uri)).retrieve().body(JsonNode.class);
            return readPlaces(root);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Yandex geocoder failed: {}", e.getMessage());
            throw ApiException.unavailable("Не удалось найти адрес. Проверьте формулировку или поставьте точку на карте.");
        }
    }

    public GeoPlace reverse(double latitude, double longitude) {
        List<GeoPlace> places = geocode(longitude + "," + latitude);
        if (places.isEmpty()) {
            throw ApiException.notFound("По этим координатам адрес не нашёлся — впишите его вручную");
        }
        return places.get(0);
    }

    public RoutePlan route(double fromLat, double fromLon, double toLat, double toLon, String mode) {
        if (TextUtils.isBlank(routerKey)) {
            throw ApiException.unavailable("Маршрутизатор Яндекса не настроен.");
        }
        String yandexMode = switch (mode == null ? "" : mode) {
            case "auto", "driving" -> "driving";
            case "transit" -> "transit";
            case "bicycle" -> "bicycle";
            default -> "walking";
        };
        // Яндекс ждёт «широта,долгота|широта,долгота». В URI черта уходит как %7C — так её принимает и Java, и API.
        String waypoints = fromLat + "," + fromLon + "|" + toLat + "," + toLon;
        String uri = UriComponentsBuilder
                .fromUriString("https://api.routing.yandex.net/v2/route")
                .queryParam("apikey", routerKey)
                .queryParam("waypoints", waypoints)
                .queryParam("mode", yandexMode)
                .build()
                .encode()
                .toUriString();
        try {
            JsonNode root = http.get().uri(URI.create(uri)).retrieve().body(JsonNode.class);
            return readRoute(root, yandexMode);
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.warn("Yandex router failed: {}", e.getMessage());
            throw ApiException.unavailable("Яндекс не смог построить маршрут. Попробуйте другой адрес отправления или режим.");
        }
    }

    private static List<GeoPlace> readPlaces(JsonNode root) {
        JsonNode members = root == null ? null : root.path("response").path("GeoObjectCollection").path("featureMember");
        if (members == null || !members.isArray() || members.isEmpty()) {
            return List.of();
        }
        List<GeoPlace> places = new ArrayList<>();
        for (JsonNode member : members) {
            JsonNode object = member.path("GeoObject");
            String address = object.path("metaDataProperty").path("GeocoderMetaData").path("text").asText("");
            if (address.isBlank()) {
                address = object.path("name").asText("");
            }
            String pos = object.path("Point").path("pos").asText("");
            String[] parts = pos.split(" ");
            if (parts.length < 2 || address.isBlank()) {
                continue;
            }
            places.add(new GeoPlace(address, Double.parseDouble(parts[1]), Double.parseDouble(parts[0])));
        }
        return places;
    }

    private static RoutePlan readRoute(JsonNode root, String mode) {
        JsonNode legs = root == null ? null : root.path("route").path("legs");
        if (legs == null || !legs.isArray() || legs.isEmpty()) {
            throw ApiException.unavailable("Маршрут не найден. Проверьте, что обе точки в одном городе.");
        }
        List<Point> points = new ArrayList<>();
        double length = 0;
        double duration = 0;
        for (JsonNode leg : legs) {
            if (!"OK".equalsIgnoreCase(leg.path("status").asText("OK")) && leg.has("status")
                    && !"OK".equals(leg.path("status").asText())) {
                continue;
            }
            for (JsonNode step : leg.path("steps")) {
                length += step.path("length").asDouble(0);
                duration += step.path("duration").asDouble(0);
                JsonNode polyline = step.path("polyline").path("points");
                if (polyline.isArray()) {
                    for (JsonNode point : polyline) {
                        if (point.isArray() && point.size() >= 2) {
                            points.add(new Point(point.get(0).asDouble(), point.get(1).asDouble()));
                        }
                    }
                }
            }
        }
        if (points.isEmpty()) {
            throw ApiException.unavailable("Маршрут не найден. Попробуйте другой адрес отправления.");
        }
        return new RoutePlan(mode, Math.round(length), Math.round(duration), points);
    }

    public record GeoPlace(String address, double latitude, double longitude) {
    }

    public record Point(double latitude, double longitude) {
    }

    public record RoutePlan(String mode, long distanceMeters, long durationSeconds, List<Point> points) {
    }
}
