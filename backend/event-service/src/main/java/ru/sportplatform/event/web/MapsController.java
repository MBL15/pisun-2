package ru.sportplatform.event.web;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.event.service.YandexMapsService;
import ru.sportplatform.event.service.YandexMapsService.GeoPlace;
import ru.sportplatform.event.service.YandexMapsService.RoutePlan;

@RestController
@RequestMapping("/api/maps")
@RequiredArgsConstructor
public class MapsController {

    private final YandexMapsService maps;

    @GetMapping("/geocode")
    public List<GeoPlace> geocode(@RequestParam String q) {
        return maps.geocode(q);
    }

    @GetMapping("/reverse")
    public GeoPlace reverse(@RequestParam double lat, @RequestParam double lon) {
        return maps.reverse(lat, lon);
    }

    @GetMapping("/route")
    public RoutePlan route(@RequestParam double fromLat,
                           @RequestParam double fromLon,
                           @RequestParam double toLat,
                           @RequestParam double toLon,
                           @RequestParam(defaultValue = "walking") String mode) {
        return maps.route(fromLat, fromLon, toLat, toLon, mode);
    }
}
