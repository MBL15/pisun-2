package ru.sportplatform.event.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.event.domain.SportType;
import ru.sportplatform.event.repository.SportTypeRepository;

@Slf4j
@Component
@RequiredArgsConstructor
public class SportRegistrySeeder {

    private final SportTypeRepository sportTypes;
    private final ObjectMapper objectMapper;

    /** Загружает виды спорта из реестра Минспорта (основные категории, без подвидов). */
    public Map<String, SportType> seedCatalog() {
        Map<String, SportType> byName = new LinkedHashMap<>();
        try (InputStream in = new ClassPathResource("sport-registry.json").getInputStream()) {
            List<RegistryEntry> entries = objectMapper.readValue(in, new TypeReference<>() {
            });
            for (RegistryEntry entry : entries) {
                SportType saved = sportTypes.save(SportType.builder()
                        .name(entry.name())
                        .nameKey(TextUtils.normalizeKey(entry.name()))
                        .emoji(entry.emoji() == null ? SportTypeService.CUSTOM_EMOJI : entry.emoji())
                        .custom(false)
                        .build());
                byName.put(entry.name(), saved);
            }
            log.info("Event: загружено {} направлений из sport-registry.json", entries.size());
        } catch (IOException e) {
            throw new IllegalStateException("Не удалось прочитать sport-registry.json", e);
        }
        return byName;
    }

    private record RegistryEntry(String name, String emoji) {
    }
}
