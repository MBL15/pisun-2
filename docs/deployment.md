# Деплой на VPS

Рекомендуемый способ — Docker Compose с профилем `docker-compose.vps.yml` (PostgreSQL, пять Java-сервисов, фронт на nginx).

## Что получится

- Сайт: **http://&lt;IP-VPS&gt;/** (порт 80).
- Запросы `/api/**` nginx проксирует на `api-gateway`, поэтому в сборке фронта `VITE_API_URL` пустой (тот же origin).
- На машинах ~2 ГБ RAM скрипт включает swap 2 ГБ и снижает `-Xmx` Java до 256 МБ на сервис.

## Быстрый деплой с вашего ПК или из Cloud Agent

1. Скачайте `.pem` из панели VPS.
2. Выполните:

```bash
export DEPLOY_SSH_KEY=/path/to/privatekey-1154735.pem
export DEPLOY_HOST=195.209.212.77   # при необходимости
./scripts/deploy-vps.sh
```

Переменные `DEPLOY_USER` (по умолчанию `ubuntu`) и `DEPLOY_PATH` (по умолчанию `/opt/sportvmeste`) необязательны.

## Cloud Agent

Чтобы агент мог деплоить сам, добавьте секрет или файл ключа в окружение (например `DEPLOY_SSH_KEY` или положите ключ в `~/privatekey-1154735.pem` в snapshot окружения) и снова попросите «задеплоить на сервер».

## Обновление

Повторный запуск `./scripts/deploy-vps.sh` пересинхронизирует код и пересоберёт образы.

## Переменные (необязательно)

Создайте на сервере файл `.env` в каталоге проекта (рядом с `docker-compose.yml`):

| Переменная | Назначение |
|---|---|
| `VITE_YANDEX_MAPS_API_KEY` | Ключ Яндекс Карт |
| `AI_LLM_API_KEY` | LLM для модерации |
| `FRONTEND_ORIGINS` | CORS в шлюзе, по умолчанию `*` |
