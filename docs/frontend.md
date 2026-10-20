# Фронтенд

React 19, TypeScript, Vite, Tailwind CSS v4 (через `@tailwindcss/vite`), React Router 7, иконки Lucide, линтер oxlint. Сторонних библиотек состояния и запросов нет.

## Структура `frontend/src`

| Путь | Назначение |
|---|---|
| `main.tsx` | Точка входа: `BrowserRouter`, `AuthProvider`, тосты, `initTheme()` до рендера |
| `lib/theme.ts` | Светлая/тёмная тема: класс `dark` на `html`, ключ `sportvmeste.theme` |
| `App.tsx` | Таблица маршрутов и `RequireRole` |
| `api/client.ts` | `request()`, `api.get/post/put/delete/upload`, `ApiError`, `buildQuery`, заголовки сессии |
| `api/endpoints.ts` | Типизированные обёртки по доменам: `usersApi`, `organizationsApi`, события, комментарии, модерация, ИИ, документы |
| `api/types.ts` | TypeScript-типы, повторяющие DTO бэкенда |
| `auth/AuthContext.tsx` | Демо-сессия: текущий пользователь, список демо-аккаунтов, `login`, `logout`, `homeFor(user)` |
| `components/ui.tsx` | UI-кит: кнопки, поля, карточки, `Spinner`, `EmptyState`, `LinkButton` |
| `components/Layout.tsx` | Шапка, переключатель ролей, тёмная тема (луна/солнце), крупный шрифт «T», мобильная нижняя навигация |
| `components/maps.tsx` | Карты: выбор точки, мини-карта события, карта афиши |
| `components/Discussion.tsx` | Обсуждение события с ответами и модерацией |
| `components/EventCard.tsx`, `EventBadges.tsx` | Карточка в афише, бейджи статусов и возраста |
| `components/ReasonDialog.tsx` | Диалог ввода причины (отказ, снятие, скрытие) с готовыми вариантами |
| `components/DocumentDialog.tsx` | Предпросмотр и печать документа |
| `components/Toast.tsx` | Уведомления |
| `lib/useAsync.ts` | Хук загрузки данных: `data`, `error`, `loading`, `reload()` без мигания, защита от гонок |
| `lib/format.ts` | Форматирование дат, статусов и подписей на русском |
| `lib/osmGeocode.ts` | Nominatim/OSRM для поиска адреса и маршрута (OpenStreetMap) |
| `pages/*` | Страницы: афиша, карта, событие, форма события, клубы, кабинет, профиль, админка, вход |

## Сессия и заголовки

- Пароля нет. `AuthContext` хранит id выбранного аккаунта в `localStorage` под ключом `sportvmeste.userId` и при старте заново загружает пользователя через `GET /api/users/{id}`.
- `setSession({id, role})` в `api/client.ts` — модульная переменная. Каждый `request()` добавляет `X-User-Id` и `X-User-Role`.
- После смены роли страницы должны перезагрузить данные: ответы бэкенда зависят от того, кто смотрит. Например, `EventDto.viewer` содержит `organizer`, `canRegister`, `registrationBlockedReason`, `canSeeContacts`, `myRegistrations`.

## Роутинг и роли

`RequireRole` в `App.tsx`: без пользователя перенаправляет на `/login`, при неподходящей роли показывает заглушку.

| Маршрут | Доступ |
|---|---|
| `/`, `/feed`, `/map`, `/events/:id`, `/organizations`, `/organizations/:id`, `/users/:id`, `/login` | Все |
| `/events/new`, `/events/:id/edit` | `USER`, `ORGANIZATION` |
| `/me` (кабинет) | `USER`, `CHILD` |
| `/my-organization` | `ORGANIZATION` |
| `/admin` | `ADMIN` |

После входа `homeFor(user)` отправляет администратора в `/admin`, организацию в `/my-organization`, остальных на `/feed`. Лендинг — `/` (hero, CTA на афишу и вход).

Тёмная тема: семантические токены `--color-paper`, `--color-ink`, `--color-surface`, `--color-muted` переопределяются на `html.dark` в `index.css`.

Проверки ролей на фронтенде нужны только для удобства. Настоящие права проверяет бэкенд, а UI показывает его ответ.

## Работа с API

- Ошибки приходят как `ApiError` с полями `status`, `code`, `message` и `fields`. Показывайте `message` пользователю как есть: сообщения на бэкенде уже на русском. Ошибки по полям формы лежат в `fields`.
- Сетевая ошибка превращается в `ApiError(0, 'NETWORK', ...)` с подсказкой запустить шлюз на 8080.
- Не дублируйте бизнес-правила на клиенте. Например, кнопку «Записаться» показывайте по `event.viewer.canRegister`, а подпись под ней берите из `registrationBlockedReason`.
- Новый эндпоинт: тип добавьте в `api/types.ts`, обёртку в `api/endpoints.ts`, на странице используйте `useAsync`.

## Карты

- Тайлы и интерактив — **Leaflet** + **react-leaflet** (`components/maps.tsx`), тайлы OpenStreetMap. API-ключ не нужен.
- Поиск адреса и обратное геокодирование — публичный **Nominatim** (`lib/osmGeocode.ts`, переменная `VITE_NOMINATIM_URL` для своего инстанса).
- Маршрут в личном кабинете — **OSRM** (`VITE_OSRM_URL`, по умолчанию `router.project-osrm.org`).
- Метки — HTML через `L.divIcon`, стили `.map-pin*` в `index.css`. Кластеризация — `react-leaflet-markercluster`.
- Контейнер `.map-host` ограничен шириной родителя (`min-width: 0`, `max-width: 100%`).
- Кнопка «Построить маршрут» открывает openstreetmap.org.

## Переменные сборки

Переменные `VITE_*` подставляются **на этапе сборки**. В Docker они передаются через `build.args` в `docker-compose.yml`, поэтому после изменения ключа образ фронтенда нужно пересобрать.

| Переменная | По умолчанию |
|---|---|
| `VITE_API_URL` | `http://localhost:8080` |
| `VITE_NOMINATIM_URL` | `https://nominatim.openstreetmap.org` |
| `VITE_OSRM_URL` | `https://router.project-osrm.org` |

## Команды

```bash
cd frontend
npm install
npm run dev      # Vite на :5173
npm run build    # tsc -b && vite build
npm run lint     # oxlint
```

В Docker собранный `dist` раздаёт nginx (`frontend/nginx.conf`, SPA-fallback на `index.html`).
