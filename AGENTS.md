# AGENTS.md

«СпортВместе» — платформа совместных спортивных активностей: React SPA и пять Spring Boot-сервисов за Spring Cloud Gateway.

Перед изменениями прочитайте базу знаний в [docs/](docs/README.md). Чаще всего нужны:

- [docs/domain-rules.md](docs/domain-rules.md) — правила доступа, статусы и переходы. Код должен им соответствовать.
- [docs/architecture.md](docs/architecture.md) — какой сервис за что отвечает и кто кого вызывает.
- [docs/development.md](docs/development.md) — запуск и рецепты типовых изменений.

## Правила работы с кодом

- Бизнес-правила и проверки прав — только в сервисном слое бэкенда, через `CurrentUser` и `ApiException`. Фронтенд показывает решения бэкенда (например, `event.viewer.canRegister`) и не дублирует их.
- Причина отказа в записи на событие задаётся в одном месте: `EventService.registrationBlockedReason`.
- Межсервисные DTO и enum — только в `backend/common-lib`.
- Ручные действия администратора проходят через `ModerationService` в ai-moderation-service и пишутся в журнал.
- Сообщения пользователю — на русском, понятные и с подсказкой, что делать.
- Новый публичный префикс API нужно добавить в маршруты `backend/api-gateway/src/main/resources/application.yml`.
- Демо-аккаунты добавляются только в конец списка, иначе сломаются id из `DemoIds`.
- Изменили правило, архитектуру или нашли долг — обновите соответствующий файл в `docs/`.

## Проверка

- Бэкенд: `cd backend && .\mvnw.cmd -q -B -DskipTests package`. Автотестов нет.
- Фронтенд: `cd frontend && npm run build && npm run lint`.
- Запуск: `.\start.ps1 -Rebuild`, затем http://localhost:5173.
