# Архитектура

Общая схема и таблица модулей есть в корневом [README](../README.md#архитектура). Здесь — детали, которые нужны при изменении кода.

## Модули

Бэкенд — многомодульный Maven-проект `backend/pom.xml` (Spring Boot 3.3.5, Spring Cloud 2023.0.3, Java 21, Lombok). Базовый пакет `ru.sportplatform.<сервис>`.

| Модуль | Порт | Пакет | Внутренняя структура |
|---|---|---|---|
| `common-lib` | — | `ru.sportplatform.common` | `enums`, `dto` (межсервисные records), `error`, `web`, `util`, `DemoIds` |
| `api-gateway` | 8080 | `ru.sportplatform.gateway` | Только `application.yml` с маршрутами и CORS, кода нет |
| `identity-service` | 8081 | `ru.sportplatform.identity` | `domain`, `repository`, `service`, `web`, `web/dto`, `DataInitializer` |
| `event-service` | 8082 | `ru.sportplatform.event` | То же плюс `client` (вызовы identity и ai) |
| `ai-moderation-service` | 8083 | `ru.sportplatform.moderation` | То же плюс `ai` (`HeuristicAnalyzer`, `LlmClient`) и `client` |
| `doc-generator-service` | 8084 | `ru.sportplatform.docs` | То же плюс `templates-default/*.html` в ресурсах |

Каждый сервис устроен одинаково: контроллер тонкий и только принимает `CurrentUser` и DTO, все правила доступа и бизнес-проверки живут в `service`. Сущности JPA не выходят за пределы сервиса: наружу отдаются records из `web/dto` или `common-lib/dto`.

## Маршрутизация в шлюзе

Файл `backend/api-gateway/src/main/resources/application.yml`.

| Префикс пути | Сервис |
|---|---|
| `/api/users`, `/api/organizations`, `/api/families` | identity-service |
| `/api/events`, `/api/sports`, `/api/comments` | event-service |
| `/api/moderation`, `/api/ai` | ai-moderation-service |
| `/api/documents` | doc-generator-service |

Префикс `/internal/**` в шлюзе не опубликован. Шлюз ничего не проверяет: он пробрасывает заголовки `X-User-Id` и `X-User-Role` как есть. CORS настроен в шлюзе (`FRONTEND_ORIGINS`, по умолчанию `*`), в сервисах его нет.

Новый публичный префикс нужно добавить в `predicates` нужного маршрута, иначе шлюз ответит 404.

## Межсервисные вызовы

Все вызовы синхронные, через `RestClient` с `SimpleClientHttpRequestFactory`. Базовые URL задаются в секции `services.*` в `application.yml` и переопределяются переменными `*_SERVICE_URL`.

| Кто вызывает | Кого | Путь | Зачем | Таймаут чтения |
|---|---|---|---|---|
| event | identity | `GET /api/users/{id}`, `GET /api/users/{id}/children` | Автор события, участник, проверка родителя | 5 с |
| event | ai | `POST /api/ai/verify-event` | Вердикт при создании и редактировании события | 20 с |
| event | ai | `POST /api/ai/verify-comment` | Фильтр нового комментария | 20 с |
| ai | identity | `GET /api/users/{id}` | Имя администратора для журнала | — |
| ai | identity | `POST /internal/organizations/{id}/decision` | Одобрить или отклонить организацию | — |
| ai | event | `POST /internal/events/{id}/status` | Снять, удалить, опубликовать событие | — |
| ai | event | `POST /internal/comments/{id}/visibility`, `DELETE /internal/comments/{id}` | Модерация комментариев | — |
| doc | event | `GET /internal/events/{id}` | Данные события для документа | — |
| doc | identity | `GET /api/users/{id}` | Участник, ребёнок, родитель | — |
| ai | LLM | `POST {AI_LLM_BASE_URL}/chat/completions` | Опциональная LLM-проверка | 10 с (`AI_LLM_TIMEOUT`) |

Конфигурация клиентов: `event-service/.../client/ClientConfig.java`, `ai-moderation-service/.../client/PlatformClients.java`, `doc-generator-service/.../client/DocClients.java`.

### Поведение при отказах

- **ai-moderation-service недоступен при создании события.** `AiClient.verifyEvent` ловит любое исключение и возвращает вердикт `FALLBACK`: `AI_APPROVED`, возраст `CHILD_SAFE` (или `ADULT_ONLY`, если аудитория «Взрослые»), `hold = false`. Событие публикуется сразу.
- **ai-moderation-service недоступен при отправке комментария.** Комментарий сохраняется видимым.
- **LLM недоступна или вернула мусор.** `LlmClient.verify` возвращает `Optional.empty()`, остаётся только эвристика.
- **Остальные сервисы недоступны.** `GlobalExceptionHandler` превращает `ResourceAccessException` в `503 SERVICE_UNAVAILABLE` с русским сообщением.
- **Соседний сервис ответил ошибкой.** `RestClientResponseException` разбирается как `ApiError` и пробрасывается клиенту с исходным статусом и сообщением. Поэтому ошибка из identity, например «Организация не найдена», доходит до фронтенда без изменений.

## Контекст пользователя

`common-lib/web`:

- `UserHeaders.from(request)` читает `X-User-Id` и `X-User-Role`. Если любого нет или он не парсится, возвращается `CurrentUser.ANONYMOUS`.
- `CurrentUserArgumentResolver` подставляет `CurrentUser` в любой параметр контроллера этого типа. Регистрируется в `CommonWebConfig`.
- `CurrentUser.requireAuthenticated()` бросает 401, `requireAdmin()` бросает 401 или 403.

Межсервисные вызовы заголовки пользователя не передают. Поэтому `/internal/**` не проверяют права, а проверка администратора делается в ai-moderation-service до вызова.

## Ошибки

Единый формат `ApiError {status, code, message, fields, timestamp}`. Бросайте `ApiException.notFound / forbidden / unauthorized / badRequest / conflict / gone / unavailable` с понятным пользователю русским текстом: фронтенд показывает `message` как есть.

Ошибки Bean Validation (`@Valid`) превращаются в `400 VALIDATION_ERROR`, а `fields` заполняется сообщениями по полям.

## Хранилище

- Одна физическая база `sportdb`, у каждого сервиса свои таблицы. Внешних ключей между таблицами разных сервисов нет, связи хранятся как id.
- Схема создаётся Hibernate (`ddl-auto: update`). Миграций (Flyway или Liquibase) нет.
- Профиль `local` (по умолчанию): файловая H2 `jdbc:h2:file:${SPORT_DATA_DIR:./data}/sportdb;AUTO_SERVER=TRUE`. Первый запущенный процесс становится сервером H2, остальные подключаются к нему, поэтому `start.ps1` ждёт 6 секунд после identity-service. H2-консоль: `http://localhost:<порт>/h2-console`, пользователь `sa` без пароля.
- Профиль `docker`: PostgreSQL 16, параметры `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

### Демо-данные

Каждый сервис заполняет свою часть в `DataInitializer` (`CommandLineRunner`), только если его таблицы пусты. Исключение — doc-generator-service: он досоздаёт недостающие шаблоны при каждом старте. Ссылки между сервисами опираются на константы `DemoIds`. Это работает, потому что на чистой БД identity-service создаёт аккаунты строго по порядку и они получают id 1–7. Если поменять порядок создания аккаунтов в `identity-service/DataInitializer`, демо-события и заявки начнут ссылаться не на тех людей.

## Наблюдаемость

- Actuator: `/actuator/health` и `/actuator/info` на каждом сервисе, на шлюзе дополнительно `/actuator/gateway`.
- При локальном запуске логи пишутся в `backend/logs/<сервис>.log` и `<сервис>.err.log`, логи фронтенда — в `frontend.log`.
- Трассировки и корреляционных id нет.
