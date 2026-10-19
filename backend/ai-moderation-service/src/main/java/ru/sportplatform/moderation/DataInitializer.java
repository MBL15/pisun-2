package ru.sportplatform.moderation;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ru.sportplatform.common.DemoIds;
import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.AiStatus;
import ru.sportplatform.moderation.domain.AiVerdict;
import ru.sportplatform.moderation.domain.ModerationAction;
import ru.sportplatform.moderation.repository.AiVerdictRepository;
import ru.sportplatform.moderation.repository.ModerationActionRepository;
import ru.sportplatform.moderation.repository.ModerationSettingsRepository;
import ru.sportplatform.moderation.service.SettingsService;

/** Настройки ИИ по умолчанию и история проверок для стартовых мероприятий event-service. */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final ModerationSettingsRepository settings;
    private final AiVerdictRepository verdicts;
    private final ModerationActionRepository actions;

    @Override
    @Transactional
    public void run(String... args) {
        if (settings.count() > 0) {
            log.info("AI moderation: настройки уже есть");
            return;
        }
        settings.save(SettingsService.defaults());

        Instant base = Instant.now().minus(2, ChronoUnit.DAYS);
        verdict(1L, "Дворовый футбол 5×5 — вечерняя игра", DemoIds.ORG_APPROVED_NAME, true, AiStatus.AI_APPROVED,
                AgeRestriction.ADULT_ONLY, "Нарушений не найдено. Возрастной допуск 18+.",
                "Организатор указал аудиторию «Взрослые»", false, base);
        verdict(2L, "Шахматный блиц в Центральном парке", DemoIds.ADULT_NAME, false, AiStatus.AI_APPROVED,
                AgeRestriction.CHILD_SAFE, "Нарушений не найдено. Подходит для детей.",
                "Детский/семейный формат: «семьёй»", false, base.plus(1, ChronoUnit.HOURS));
        verdict(3L, "Утренняя пробежка 5 км по острову Татышев", DemoIds.IRINA_NAME, false, AiStatus.AI_APPROVED,
                AgeRestriction.CHILD_SAFE, "Нарушений не найдено. Подходит для детей.", "", false,
                base.plus(2, ChronoUnit.HOURS));
        verdict(4L, "Детская зарядка во дворе", DemoIds.ORG_APPROVED_NAME, true, AiStatus.AI_APPROVED,
                AgeRestriction.CHILD_SAFE, "Нарушений не найдено. Подходит для детей.",
                "Организатор указал аудиторию «Дети»", false, base.plus(3, ChronoUnit.HOURS));
        verdict(5L, "Скандинавская ходьба на набережной Енисея", DemoIds.DMITRY_NAME, false, AiStatus.AI_APPROVED,
                AgeRestriction.CHILD_SAFE, "Нарушений не найдено. Подходит для детей.", "", false,
                base.plus(4, ChronoUnit.HOURS));
        verdict(6L, "Спарринг на деньги — ставки у входа", DemoIds.DMITRY_NAME, false, AiStatus.FLAGGED,
                AgeRestriction.ADULT_ONLY,
                "Найдены возможные нарушения правил платформы. Событие отправлено администратору на проверку и пока не видно в ленте.",
                "Азартные игры и ставки: «ставки», «на деньги»\nАлкоголь: «пиво»\nПоздний вечер: начало в 22:30",
                true, base.plus(5, ChronoUnit.HOURS));

        actions.save(ModerationAction.builder()
                .type(ModerationAction.Type.ORGANIZATION_APPROVED)
                .targetType("ORGANIZATION").targetId(DemoIds.ORG_APPROVED).targetTitle(DemoIds.ORG_APPROVED_NAME)
                .adminId(DemoIds.ADMIN).adminName(DemoIds.ADMIN_NAME)
                .createdAt(Instant.now().minus(3, ChronoUnit.DAYS))
                .build());
        log.info("AI moderation: созданы настройки и {} вердиктов", verdicts.count());
    }

    private void verdict(Long eventId, String title, String organizer, boolean org, AiStatus status, AgeRestriction age,
                         String summary, String reasons, boolean hold, Instant at) {
        verdicts.save(AiVerdict.builder()
                .eventId(eventId).eventTitle(title).organizerName(organizer).organizationEvent(org)
                .status(status).ageRestriction(age).summary(summary).reasons(reasons)
                .source("HEURISTIC").hold(hold).createdAt(at)
                .build());
    }
}
