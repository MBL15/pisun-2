package ru.sportplatform.event;

import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ru.sportplatform.common.catalog.SportLexicon;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.event.domain.SportType;
import ru.sportplatform.event.repository.SportTypeRepository;
import ru.sportplatform.event.service.SportProfiles;

/** Дописывает виды спорта из реестра, даже если демо-события уже созданы. Дубли по ключу не создаёт. */
@Slf4j
@Component
@Order(20)
@RequiredArgsConstructor
public class SportCatalogSeeder implements CommandLineRunner {

    private final SportTypeRepository sportTypes;

    @Override
    @Transactional
    public void run(String... args) {
        int added = 0;
        for (SportLexicon.Entry entry : SportLexicon.all()) {
            String key = TextUtils.normalizeKey(entry.name());
            if (sportTypes.findByNameKey(key).isPresent()) {
                continue;
            }
            SportType sport = SportType.builder()
                    .name(entry.name())
                    .nameKey(key)
                    .emoji(entry.emoji())
                    .category(entry.category())
                    .icon(entry.icon())
                    .defaultAge(entry.defaultAge())
                    .custom(false)
                    .build();
            SportProfiles.apply(sport);
            sportTypes.save(sport);
            added++;
        }
        int enriched = 0;
        for (SportType sport : sportTypes.findAll()) {
            if (sport.getDescription() != null && sport.getCategory() != null) {
                continue;
            }
            SportProfiles.apply(sport);
            enriched++;
        }
        log.info("Справочник видов спорта: добавлено {}, карточки дополнены у {}", added, enriched);
    }
}
