# Разработка

## Требования

- Node.js 20+.
- Java 21. Если её нет, `start.ps1` сам скачает Temurin JDK в `.tools/`, а `start.sh` попросит установить.
- Maven ставить не нужно, есть `backend/mvnw(.cmd)`.
- Docker нужен только для варианта с PostgreSQL.

## Запуск

| Задача | Windows | Linux, macOS |
|---|---|---|
| Запустить всё | `.\start.ps1` | `./start.sh` |
| Пересобрать бэкенд и запустить | `.\start.ps1 -Rebuild` | — |
| Сбросить данные к демо-состоянию | `.\start.ps1 -ResetData` | — |
| Только бэкенд | `.\start.ps1 -NoFrontend` | — |
| Остановить | `.\stop.ps1` | `./stop.sh` |
| Docker с PostgreSQL | `docker compose up --build` | то же |
| Сброс данных в Docker | `docker compose down -v` | то же |

Что делает `start.ps1`:

1. Останавливает ранее запущенное (`stop.ps1 -Quiet`, PID берутся из `backend/logs/pids.txt`).
2. Находит Java 21.
3. Собирает бэкенд (`mvnw -q -B -DskipTests package`), только если не хватает какого-нибудь jar или передан `-Rebuild`. **Изменения в Java-коде без `-Rebuild` не подхватятся**, если jar уже существуют.
4. Запускает 5 jar с `-Xmx384m` в порядке identity, event, ai, doc, gateway.
5. Запускает `npm run dev -- --host`.
6. Опрашивает `/actuator/health` каждого сервиса до 3 минут.

## Разработка одного сервиса

Удобно запустить всё скриптом, остановить нужный сервис и запустить его из IDE или так:

```powershell
cd backend
.\mvnw.cmd -pl event-service -am spring-boot:run
```

Профиль `local` включён по умолчанию. Если запускать не из `backend`, задайте `SPORT_DATA_DIR`, указав каталог `backend/data`. Иначе H2 создаст отдельную пустую базу в текущем каталоге.

Изменили `common-lib` — пересоберите зависящие сервисы (`-am` делает это автоматически).

## Логи и диагностика

- `backend/logs/<сервис>.log` — stdout сервиса, `*.err.log` — stderr.
- Сервис «НЕ ОТВЕЧАЕТ» после старта: смотрите его лог. Частые причины — порт занят старым процессом (запустите `stop.ps1`) или H2 заблокирована.
- H2-консоль: `http://localhost:8081/h2-console`, JDBC URL `jdbc:h2:file:<абсолютный путь>/backend/data/sportdb;AUTO_SERVER=TRUE`, пользователь `sa`.
- Маршруты шлюза: `GET http://localhost:8080/actuator/gateway/routes`.

## Ручные запросы

Заголовки пользователя передавайте явно:

```bash
curl -H "X-User-Id: 3" -H "X-User-Role: ADMIN" http://localhost:8080/api/moderation/journal
curl -H "X-User-Id: 6" -H "X-User-Role: USER" -X POST http://localhost:8080/api/events/2/registrations
```

Id и роли демо-аккаунтов есть в корневом [README](../README.md#демо-аккаунты) и в `DemoIds`.

## Тесты

Сборка по умолчанию с `-DskipTests`. Эвристику модерации можно прогнать так:

```bash
cd backend
./mvnw -pl ai-moderation-service -am test
```

Проверка — также ручное прохождение сценариев из корневого README и `npm run build` / `npm run lint` для фронтенда.

## Рецепты

### Добавить поле в мероприятие

1. `event-service/domain/SportEvent` — поле сущности. Hibernate сам добавит колонку (`ddl-auto: update`). Для `NOT NULL` без значения по умолчанию на существующей БД нужен сброс данных.
2. `web/dto/EventForm` — поле ввода с аннотациями валидации, сообщения на русском.
3. `EventService.applyForm` — перенос из формы, `EventService.toDto` и `web/dto/EventDto` — выдача.
4. Если поле нужно другим сервисам — `common-lib/dto/EventSnapshotDto` и `EventService.snapshot`.
5. Если поле должна видеть ИИ-проверка — `EventVerificationRequest`, `EventService.verificationRequest`, `HeuristicAnalyzer` и `LlmClient`.
6. Демо-данные — `event-service/DataInitializer`.
7. Фронтенд — `api/types.ts`, `pages/EventFormPage.tsx`, `pages/EventPage.tsx`.

### Добавить публичный эндпоинт

1. Метод в контроллере сервиса. Параметр `CurrentUser user` подставится автоматически.
2. Проверки прав и правил — в сервисном слое через `current.requireAuthenticated()`, `requireAdmin()` и `ApiException.*`.
3. Если префикс пути новый — добавьте его в маршрут `api-gateway/application.yml`.
4. Обёртка в `frontend/src/api/endpoints.ts`.
5. Строка в таблице API корневого README.

### Добавить действие администратора

1. Внутренний эндпоинт `/internal/...` в профильном сервисе (event или identity). Он не проверяет права.
2. Метод в `PlatformClients` (ai-moderation-service).
3. Метод в `ModerationService`: `adminName(current)`, вызов клиента, `log(...)` с новым `ModerationAction.Type`.
4. Публичный эндпоинт в `ModerationController` под `/api/moderation`.

### Добавить межсервисный DTO или enum

Только в `common-lib`. Делайте records без логики, кроме простых предикатов вроде `UserDto.isApprovedOrganization`. После изменения пересоберите все сервисы, которые его используют.

### Добавить демо-аккаунт

Добавьте его **в конец** списка в `identity-service/DataInitializer` и константу в `DemoIds`. Вставка в середину сдвинет id и сломает ссылки в демо-данных других сервисов. Затем запустите с `-ResetData`.

### Добавить шаблон документа

1. HTML в `doc-generator-service/src/main/resources/templates-default/`.
2. Запись в `DefaultTemplates.ALL` и константу кода в `DocumentTemplate`.
3. Новые плейсхолдеры — в `DocumentService.PLACEHOLDERS` и в `values` внутри `generate`.
4. Перезапустите сервис: `DataInitializer` при каждом старте создаёт в БД шаблоны, которых там ещё нет. Сбрасывать данные не нужно. Уже существующие шаблоны он не перезаписывает, поэтому изменения в HTML по умолчанию применяются только через «Сбросить к шаблону по умолчанию» в админке.

## Стиль кода

- Бэкенд: Lombok (`@RequiredArgsConstructor`, `@Builder`, `@Getter`/`@Setter` на сущностях), records для DTO, тонкие контроллеры. Javadoc и комментарии на русском, только там, где правило не видно из кода.
- Все сообщения пользователю — на русском, конкретные и с подсказкой, что делать дальше.
- Фронтенд: функциональные компоненты, Tailwind-классы прямо в разметке, общие элементы — в `components/ui.tsx`.
