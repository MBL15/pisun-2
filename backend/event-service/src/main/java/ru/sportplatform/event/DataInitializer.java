package ru.sportplatform.event;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ru.sportplatform.common.DemoIds;
import ru.sportplatform.common.enums.AgeRestriction;
import ru.sportplatform.common.enums.AiStatus;
import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.common.enums.Audience;
import ru.sportplatform.common.enums.EventStatus;
import ru.sportplatform.common.enums.OrganizerType;
import ru.sportplatform.common.enums.RegistrationMode;
import ru.sportplatform.common.enums.RoleType;
import ru.sportplatform.common.util.TextUtils;
import ru.sportplatform.event.domain.EventComment;
import ru.sportplatform.event.domain.Registration;
import ru.sportplatform.event.domain.SkillLevel;
import ru.sportplatform.event.domain.SportEvent;
import ru.sportplatform.event.domain.SportType;
import ru.sportplatform.event.repository.EventCommentRepository;
import ru.sportplatform.event.repository.RegistrationRepository;
import ru.sportplatform.event.repository.SportEventRepository;
import ru.sportplatform.event.repository.SportTypeRepository;
import ru.sportplatform.event.service.SportRegistrySeeder;
import ru.sportplatform.event.service.SportTypeService;

/** Стартовые данные: справочник направлений, мероприятия в Красноярске, заявки и обсуждения. */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final SportTypeRepository sportTypes;
    private final SportRegistrySeeder registrySeeder;
    private final SportEventRepository events;
    private final RegistrationRepository registrations;
    private final EventCommentRepository comments;

    @Override
    @Transactional
    public void run(String... args) {
        if (sportTypes.count() > 0) {
            log.info("Event: демо-данные уже есть ({} мероприятий)", events.count());
            return;
        }

        Map<String, SportType> sports = registrySeeder.seedCatalog();
        SportType yard = sportTypes.findByNameKey(TextUtils.normalizeKey("Зарядка во дворе")).orElseGet(() ->
                sportTypes.save(SportType.builder().name("Зарядка во дворе").nameKey(TextUtils.normalizeKey("Зарядка во дворе"))
                        .emoji("🤸").custom(true).createdByUserId(DemoIds.ORG_APPROVED_OWNER).build()));
        sports.put("Зарядка во дворе", yard);
        SportType nordic = sportTypes.save(SportType.builder()
                .name("Скандинавская ходьба").nameKey(TextUtils.normalizeKey("Скандинавская ходьба"))
                .emoji("🏅").custom(true).createdByUserId(DemoIds.ADULT_DMITRY).build());
        sportTypes.save(SportType.builder().name("футбик").nameKey(TextUtils.normalizeKey("футбик"))
                .emoji(SportTypeService.CUSTOM_EMOJI).custom(true).createdByUserId(DemoIds.ADULT_DMITRY).build());
        sportTypes.save(SportType.builder().name("бег трусцой").nameKey(TextUtils.normalizeKey("бег трусцой"))
                .emoji(SportTypeService.CUSTOM_EMOJI).custom(true).createdByUserId(DemoIds.ADULT_IRINA).build());
        SportType runSport = sports.get("Легкая атлетика");

        LocalDate today = LocalDate.now();

        SportEvent football = events.save(SportEvent.builder()
                .title("Дворовый футбол 5×5 — вечерняя игра")
                .description("Собираем две команды по 5 человек на искусственном поле. Играем 2 тайма по 25 минут, "
                        + "потом ротация. Уровень — любители, главное — честная игра и хорошее настроение.")
                .sportType(sports.get("Футбол"))
                .startAt(today.plusDays(3).atTime(19, 0))
                .durationMinutes(90)
                .address("о. Татышев, мини-футбольное поле у Октябрьского моста")
                .locationNote("Поле с синим ограждением, вход со стороны велодорожки")
                .latitude(56.0313).longitude(92.9307)
                .conditions("Бутсы-сороконожки или кроссовки, тёмная и светлая футболка. Мячи и манишки даёт клуб. "
                        + "Участие бесплатное. Игра контактная — только для взрослых.")
                .level(SkillLevel.AMATEUR)
                .audience(Audience.ADULTS)
                .capacity(12)
                .registrationMode(RegistrationMode.BY_APPLICATION)
                .status(EventStatus.PUBLISHED)
                .organizerType(OrganizerType.ORGANIZATION)
                .organizerUserId(DemoIds.ORG_APPROVED_OWNER)
                .organizerName(DemoIds.ORG_APPROVED_NAME)
                .organizationId(DemoIds.ORG_APPROVED)
                .organizerContact("Сбор в 18:45 у синей бытовки. Капитан — Сергей, +7 900 000-00-04. "
                        + "Чат команды: t.me/legends_5x5_demo")
                .aiStatus(AiStatus.AI_APPROVED)
                .ageRestriction(AgeRestriction.ADULT_ONLY)
                .aiSummary("Нарушений не найдено. Организатор указал взрослую аудиторию — событие 18+.")
                .aiReasons("Возраст: организатор указал аудиторию «Взрослые»")
                .build());

        SportEvent chess = events.save(SportEvent.builder()
                .title("Шахматный блиц в Центральном парке")
                .description("Открытый турнир по блицу 5+3 по швейцарской системе, 7 туров. Приходите всей семьёй: "
                        + "будет отдельный стол для начинающих, где покажут базовые дебюты.")
                .sportType(sports.get("Шахматы"))
                .startAt(today.plusDays(2).atTime(12, 0))
                .durationMinutes(180)
                .address("Центральный парк им. Горького, ул. Карла Маркса, 151")
                .locationNote("Шахматная беседка у фонтана")
                .latitude(56.0120).longitude(92.8870)
                .conditions("Доски и часы есть на 8 столов — если есть свои часы, возьмите. Подходит для любого уровня.")
                .level(SkillLevel.ANY)
                .audience(Audience.ALL)
                .capacity(16)
                .registrationMode(RegistrationMode.FREE)
                .status(EventStatus.PUBLISHED)
                .organizerType(OrganizerType.USER)
                .organizerUserId(DemoIds.ADULT)
                .organizerName(DemoIds.ADULT_NAME)
                .organizerContact("Телефон организатора: +7 900 000-00-01. Если идёт дождь — переносимся в кафе «Ферзь» рядом.")
                .aiStatus(AiStatus.AI_APPROVED)
                .ageRestriction(AgeRestriction.CHILD_SAFE)
                .aiSummary("Нарушений не найдено. Подходит для детей и семейного участия.")
                .aiReasons("Подходит детям: семейный формат, дневное время")
                .build());

        SportEvent run = events.save(SportEvent.builder()
                .title("Утренняя пробежка 5 км по острову Татышев")
                .description("Лёгкая пробежка в разговорном темпе по кругу острова. Никого не бросаем: "
                        + "в конце — растяжка и кофе. Отличный вариант для тех, кто только начинает бегать.")
                .sportType(runSport)
                .startAt(today.plusDays(1).atTime(7, 30))
                .durationMinutes(60)
                .address("о. Татышев, главный вход со стороны ул. Авиаторов")
                .locationNote("Встречаемся у большой карты острова")
                .latitude(56.0275).longitude(92.9440)
                .conditions("Темп 6:00–6:30 мин/км. Удобная обувь, вода. Если не уверены — пробежим 3 км.")
                .level(SkillLevel.BEGINNER)
                .audience(Audience.ALL)
                .registrationMode(RegistrationMode.FREE)
                .status(EventStatus.PUBLISHED)
                .organizerType(OrganizerType.USER)
                .organizerUserId(DemoIds.ADULT_IRINA)
                .organizerName(DemoIds.IRINA_NAME)
                .organizerContact("Ирина: +7 900 000-00-06. Опоздавших ждём 5 минут.")
                .aiStatus(AiStatus.AI_APPROVED)
                .ageRestriction(AgeRestriction.CHILD_SAFE)
                .aiSummary("Нарушений не найдено. Подходит для начинающих и подростков.")
                .build());

        SportEvent kids = events.save(SportEvent.builder()
                .title("Детская зарядка во дворе")
                .description("Весёлая 40-минутная зарядка с играми и эстафетами для детей 6–12 лет. "
                        + "Ведёт тренер клуба с педагогическим образованием.")
                .sportType(sports.get("Зарядка во дворе"))
                .startAt(today.plusDays(2).atTime(10, 0))
                .durationMinutes(40)
                .address("Двор дома ул. Карла Маркса, 95, спортплощадка")
                .locationNote("Площадка с резиновым покрытием за детским садом")
                .latitude(56.0129).longitude(92.8979)
                .conditions("Удобная одежда и обувь, бутылка воды. Родители могут остаться рядом. Бесплатно.")
                .level(SkillLevel.BEGINNER)
                .audience(Audience.KIDS)
                .capacity(20)
                .registrationMode(RegistrationMode.FREE)
                .status(EventStatus.PUBLISHED)
                .organizerType(OrganizerType.ORGANIZATION)
                .organizerUserId(DemoIds.ORG_APPROVED_OWNER)
                .organizerName(DemoIds.ORG_APPROVED_NAME)
                .organizationId(DemoIds.ORG_APPROVED)
                .organizerContact("Тренер Анна: +7 900 000-00-14. Согласие родителя можно сформировать на странице события.")
                .aiStatus(AiStatus.AI_APPROVED)
                .ageRestriction(AgeRestriction.CHILD_SAFE)
                .aiSummary("Нарушений не найдено. Детское мероприятие в дневное время — безопасно для детей.")
                .aiReasons("Подходит детям: аудитория «Дети», дневное время")
                .build());

        events.save(SportEvent.builder()
                .title("Скандинавская ходьба на набережной Енисея")
                .description("Спокойная прогулка с палками 6 км вдоль набережной. Покажем правильную технику, "
                        + "подберём палки по росту. Идеально для старшего поколения и тех, кто восстанавливается.")
                .sportType(nordic)
                .startAt(today.plusDays(4).atTime(9, 0))
                .durationMinutes(90)
                .address("Набережная Енисея, у Коммунального моста")
                .locationNote("Сбор у часов на площади Мира")
                .latitude(56.0081).longitude(92.8706)
                .conditions("Палки выдаём бесплатно — поэтому нужна заявка, чтобы подготовить инвентарь. "
                        + "Удобная обувь, одежда по погоде.")
                .level(SkillLevel.BEGINNER)
                .audience(Audience.ALL)
                .capacity(10)
                .registrationMode(RegistrationMode.BY_APPLICATION)
                .status(EventStatus.PUBLISHED)
                .organizerType(OrganizerType.USER)
                .organizerUserId(DemoIds.ADULT_DMITRY)
                .organizerName(DemoIds.DMITRY_NAME)
                .organizerContact("Дмитрий: +7 900 000-00-07")
                .aiStatus(AiStatus.AI_APPROVED)
                .ageRestriction(AgeRestriction.CHILD_SAFE)
                .aiSummary("Нарушений не найдено. Новое направление «Скандинавская ходьба» добавлено пользователем.")
                .build());

        events.save(SportEvent.builder()
                .title("Утренний бег — шахматный разбор после дистанции")
                .description("Сначала лёгкая пробежка 3 км, затем за чаем разберём партию из шахматного блица. "
                        + "Подойдёт тем, кто совмещает бег и шахматы.")
                .sportType(runSport)
                .startAt(today.plusDays(6).atTime(8, 0))
                .durationMinutes(75)
                .address("о. Татышев, беговая дорожка")
                .latitude(56.0280).longitude(92.9420)
                .conditions("Кроссовки и, по желанию, шахматные часы.")
                .level(SkillLevel.ANY)
                .audience(Audience.ALL)
                .registrationMode(RegistrationMode.FREE)
                .status(EventStatus.PUBLISHED)
                .organizerType(OrganizerType.USER)
                .organizerUserId(DemoIds.ADULT)
                .organizerName(DemoIds.ADULT_NAME)
                .aiStatus(AiStatus.FLAGGED)
                .ageRestriction(AgeRestriction.CHILD_SAFE)
                .aiSummary("ИИ отметил возможное несоответствие вида спорта и описания (SPORT_MISMATCH).")
                .aiReasons("SPORT_MISMATCH: выбран бег, в тексте — шахматы")
                .build());

        events.save(SportEvent.builder()
                .title("Спарринг на деньги — ставки у входа")
                .description("Бои один на один, победитель забирает банк. Ставки принимаем наличными, пиво после.")
                .sportType(sportTypes.save(SportType.builder()
                        .name("Единоборства").nameKey(TextUtils.normalizeKey("Единоборства"))
                        .emoji("🥊").custom(true).createdByUserId(DemoIds.ADULT_DMITRY).build()))
                .startAt(today.plusDays(5).atTime(22, 30))
                .durationMinutes(120)
                .address("ул. Взлётная, 7, подвальное помещение")
                .latitude(56.0480).longitude(92.9050)
                .conditions("Взнос 2000 ₽ наличными.")
                .level(SkillLevel.ANY)
                .audience(Audience.ADULTS)
                .registrationMode(RegistrationMode.FREE)
                .status(EventStatus.ON_REVIEW)
                .organizerType(OrganizerType.USER)
                .organizerUserId(DemoIds.ADULT_DMITRY)
                .organizerName(DemoIds.DMITRY_NAME)
                .aiStatus(AiStatus.FLAGGED)
                .ageRestriction(AgeRestriction.ADULT_ONLY)
                .aiSummary("Обнаружены признаки азартных игр и алкоголя. Событие отправлено администратору на проверку.")
                .aiReasons("Азартные игры и ставки: «ставки», «на деньги»\nАлкоголь: «пиво»\nПоздний вечер: начало в 22:30")
                .build());

        Instant now = Instant.now();
        registrations.save(pending(football.getId(), DemoIds.ADULT_IRINA, DemoIds.IRINA_NAME, 29,
                "Играла в женской мини-футбольной лиге, могу на любую позицию.", now.minus(5, ChronoUnit.HOURS)));
        registrations.save(pending(football.getId(), DemoIds.ADULT_DMITRY, DemoIds.DMITRY_NAME, 24,
                "Привет! Хочу в команду, обычно играю в защите.", now.minus(2, ChronoUnit.HOURS)));
        registrations.save(Registration.builder()
                .eventId(chess.getId())
                .participantId(DemoIds.ADULT_IRINA).participantName(DemoIds.IRINA_NAME).participantAge(29)
                .registeredById(DemoIds.ADULT_IRINA).registeredByName(DemoIds.IRINA_NAME)
                .status(ApplicationStatus.APPROVED)
                .createdAt(now.minus(1, ChronoUnit.DAYS)).decidedAt(now.minus(1, ChronoUnit.DAYS))
                .build());

        EventComment question = comments.save(comment(chess.getId(), null, DemoIds.ADULT_IRINA, DemoIds.IRINA_NAME,
                RoleType.USER, "#0891b2", false,
                "Здравствуйте! Подойдёт ли турнир для человека, который играет только с компьютером? И нужно ли брать свои часы?",
                now.minus(20, ChronoUnit.HOURS)));
        comments.save(comment(chess.getId(), question.getId(), DemoIds.ADULT, DemoIds.ADULT_NAME,
                RoleType.USER, "#2563eb", true,
                "Ирина, конечно подойдёт! Для новичков будет отдельный стол с разбором. Часы есть, свои — по желанию.",
                now.minus(18, ChronoUnit.HOURS)));

        EventComment kidsQuestion = comments.save(comment(kids.getId(), null, DemoIds.ADULT, DemoIds.ADULT_NAME,
                RoleType.USER, "#2563eb", false,
                "Можно ли ребёнку 11 лет прийти без родителя? Живём в соседнем доме.",
                now.minus(10, ChronoUnit.HOURS)));
        comments.save(comment(kids.getId(), kidsQuestion.getId(), DemoIds.ORG_APPROVED_OWNER, DemoIds.ORG_APPROVED_NAME,
                RoleType.ORGANIZATION, "#ea580c", true,
                "Да, с 10 лет можно без сопровождения — нужно только согласие родителя. Его можно сформировать прямо на странице события в один клик.",
                now.minus(9, ChronoUnit.HOURS)));

        comments.save(comment(run.getId(), null, DemoIds.ADULT_DMITRY, DemoIds.DMITRY_NAME, RoleType.USER, "#ca8a04",
                false, "А если я бегаю медленнее 7:00 — не задержу группу?", now.minus(3, ChronoUnit.HOURS)));

        log.info("Event: созданы {} направлений, {} мероприятий, {} заявок, {} сообщений, «{}» с заявками PENDING",
                sportTypes.count(), events.count(), registrations.count(), comments.count(), football.getTitle());
    }

    private static Registration pending(Long eventId, Long userId, String name, int age, String message, Instant at) {
        return Registration.builder()
                .eventId(eventId)
                .participantId(userId).participantName(name).participantAge(age)
                .registeredById(userId).registeredByName(name)
                .status(ApplicationStatus.PENDING)
                .message(message)
                .createdAt(at)
                .build();
    }

    private static EventComment comment(Long eventId, Long parentId, Long authorId, String authorName, RoleType role,
                                        String color, boolean organizer, String text, Instant at) {
        return EventComment.builder()
                .eventId(eventId).parentId(parentId)
                .authorId(authorId).authorName(authorName).authorRole(role).authorAvatarColor(color)
                .organizerReply(organizer)
                .text(text)
                .createdAt(at)
                .build();
    }
}
