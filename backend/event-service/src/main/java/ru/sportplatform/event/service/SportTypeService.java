package ru.sportplatform.event.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.common.error.ApiException;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.event.domain.SportType;
import ru.sportplatform.event.repository.SportEventRepository;
import ru.sportplatform.event.repository.SportTypeRepository;
import ru.sportplatform.event.web.dto.SportTypeDto;

@Service
@RequiredArgsConstructor
public class SportTypeService {

    public static final String CUSTOM_EMOJI = "🏅";

    private final SportTypeRepository sportTypes;
    private final SportEventRepository events;

    @Transactional(readOnly = true)
    public List<SportTypeDto> list() {
        return sportTypes.findByArchivedFalseOrderByCustomAscNameAsc().stream()
                .map(this::toDto)
                .toList();
    }

    public SportTypeDto toDto(SportType sport) {
        return new SportTypeDto(sport.getId(), sport.getName(), sport.getEmoji(), sport.isCustom(),
                events.countBySportTypeIdAndStatus(sport.getId(), EventStatus.PUBLISHED),
                sport.getCategory(), sport.getIcon(), sport.getTags(), sport.getDefaultAge(),
                sport.getDescription(), sport.getEquipment(), sport.getSafetyNotes(), sport.getTypicalDurationMinutes());
    }

    /**
     * Выбор из справочника или своё направление. Своё название сверяется с существующими без учёта
     * регистра и лишних пробелов, чтобы «бег» и «Бег » не превращались в два разных вида спорта.
     */
    @Transactional
    public SportType resolve(Long sportTypeId, String customName, Long userId) {
        if (!TextUtils.isBlank(customName)) {
            return findOrCreate(customName, userId);
        }
        if (sportTypeId == null) {
            throw ApiException.badRequest("Выберите направление из списка или впишите своё");
        }
        return sportTypes.findById(sportTypeId)
                .orElseThrow(() -> ApiException.badRequest("Направление #" + sportTypeId + " не найдено"));
    }

    @Transactional
    public SportType findOrCreate(String name, Long userId) {
        String key = TextUtils.normalizeKey(name);
        if (key.length() < 2) {
            throw ApiException.badRequest("Название направления слишком короткое");
        }
        return sportTypes.findByNameKey(key).orElseGet(() -> {
            SportType created = SportType.builder()
                    .name(TextUtils.prettify(name))
                    .nameKey(key)
                    .emoji(CUSTOM_EMOJI)
                    .custom(true)
                    .createdByUserId(userId)
                    .build();
            SportProfiles.apply(created);
            return sportTypes.save(created);
        });
    }
}
