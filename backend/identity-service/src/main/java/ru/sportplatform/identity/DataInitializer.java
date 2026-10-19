package ru.sportplatform.identity;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ru.sportplatform.common.DemoIds;
import ru.sportplatform.common.enums.ApplicationStatus;
import ru.sportplatform.common.enums.Gender;
import ru.sportplatform.common.enums.RoleType;
import ru.sportplatform.identity.domain.Family;
import ru.sportplatform.identity.domain.Organization;
import ru.sportplatform.identity.domain.UserAccount;
import ru.sportplatform.identity.repository.FamilyRepository;
import ru.sportplatform.identity.repository.OrganizationRepository;
import ru.sportplatform.identity.repository.UserAccountRepository;

/**
 * Демо-аккаунты для переключателя ролей. Порядок создания важен: id совпадают с {@link DemoIds},
 * на них ссылаются стартовые данные остальных сервисов.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserAccountRepository users;
    private final OrganizationRepository organizations;
    private final FamilyRepository families;

    @Override
    @Transactional
    public void run(String... args) {
        if (users.count() > 0) {
            log.info("Identity: демо-данные уже есть ({} аккаунтов)", users.count());
            return;
        }

        UserAccount adult = users.save(user(DemoIds.ADULT_NAME, "alexey@demo.sport", RoleType.USER, 38,
                "Футбол, бег, шахматы", "Папа Миши. По выходным собираю ребят на дворовый футбол.",
                "#2563eb", "Взрослый", 1, Gender.MALE));
        UserAccount child = user(DemoIds.CHILD_NAME, null, RoleType.CHILD, 11,
                "Футбол, зарядка", "Учусь в 5 классе, хочу в футбольную секцию.", "#16a34a", "Ребёнок", 2, null);
        child.setParentId(adult.getId());
        users.save(child);
        users.save(user(DemoIds.ADMIN_NAME, "admin@demo.sport", RoleType.ADMIN, 34,
                null, "Администратор платформы: допуск организаций и модерация.", "#dc2626", "Администратор", 3, null));
        UserAccount approvedOwner = users.save(user(DemoIds.ORG_APPROVED_OWNER_NAME, "legends@demo.sport",
                RoleType.ORGANIZATION, 42, "Футбол, зарядка", "Представитель клуба «Дворовые легенды».",
                "#ea580c", "Организация (одобрена)", 4, null));
        UserAccount pendingOwner = users.save(user(DemoIds.ORG_PENDING_OWNER_NAME, "ladya@demo.sport",
                RoleType.ORGANIZATION, 51, "Шахматы", "Руководитель шахматного клуба.",
                "#9333ea", "Организация (на рассмотрении)", 5, null));
        users.save(user(DemoIds.IRINA_NAME, "irina@demo.sport", RoleType.USER, 29,
                "Бег, йога", "Бегаю по утрам на Татышеве, ищу компанию.", "#0891b2", "Пользователь Ирина", 6, Gender.FEMALE));
        users.save(user(DemoIds.DMITRY_NAME, "dmitry@demo.sport", RoleType.USER, 24,
                "Футбол, единоборства", "Играю в футбол с универа.", "#ca8a04", "Пользователь Дмитрий", 7, Gender.MALE));
        UserAccount spouse = users.save(user(DemoIds.ADULT_SPOUSE_NAME, "maria@demo.sport", RoleType.USER, 36,
                "Бег, семейный спорт", "Мама Миши. Помогаю мужу собирать ребят на дворовый футбол.",
                "#db2777", "Супруга (демо)", 8, Gender.FEMALE));

        Family family = families.save(Family.builder().maleUserId(adult.getId()).femaleUserId(spouse.getId()).build());
        adult.setFamilyId(family.getId());
        spouse.setFamilyId(family.getId());
        child.setFamilyId(family.getId());

        Organization approved = organizations.save(Organization.builder()
                .name(DemoIds.ORG_APPROVED_NAME)
                .description("Дворовый спортивный клуб Красноярска. Проводим открытые игры в футбол 5×5, "
                        + "детскую зарядку во дворах и семейные спортивные праздники. Инвентарь даём свой, "
                        + "новичков учим с нуля.")
                .sportsInterests("Футбол, Зарядка во дворе, Семейный спорт")
                .city("Красноярск")
                .address("ул. Карла Маркса, 95 (спортплощадка во дворе)")
                .contacts("+7 (391) 200-00-01, legends@demo.sport")
                .website("https://t.me/dvorovye_legendy_demo")
                .logoColor("#ea580c")
                .status(ApplicationStatus.APPROVED)
                .ownerUserId(approvedOwner.getId())
                .reviewedAt(Instant.now().minus(3, ChronoUnit.DAYS))
                .reviewedBy(DemoIds.ADMIN_NAME)
                .build());
        approvedOwner.setOrganizationId(approved.getId());

        Organization pending = organizations.save(Organization.builder()
                .name(DemoIds.ORG_PENDING_NAME)
                .description("Шахматный клуб при библиотеке. Хотим проводить открытые блиц-турниры для всех "
                        + "возрастов и занятия для начинающих по субботам.")
                .sportsInterests("Шахматы, Шашки")
                .city("Красноярск")
                .address("пр. Мира, 74, библиотека, 2 этаж")
                .contacts("+7 (391) 200-00-02, ladya@demo.sport")
                .logoColor("#9333ea")
                .status(ApplicationStatus.PENDING)
                .ownerUserId(pendingOwner.getId())
                .build());
        pendingOwner.setOrganizationId(pending.getId());

        log.info("Identity: созданы демо-аккаунты (8), семья Петровых и организации (2)");
    }

    private static UserAccount user(String name, String email, RoleType role, int age, String interests,
                                    String bio, String color, String demoLabel, int order, Gender gender) {
        return UserAccount.builder()
                .displayName(name)
                .email(email)
                .role(role)
                .age(age)
                .city("Красноярск")
                .interests(interests)
                .bio(bio)
                .avatarColor(color)
                .gender(gender)
                .demo(true)
                .demoLabel(demoLabel)
                .demoOrder(order)
                .build();
    }
}
