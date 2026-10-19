#!/usr/bin/env bash
# Сборка и запуск стека в Docker. Локальные jar/vite останавливаются.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

bash "$ROOT/stop.sh" --quiet 2>/dev/null || true
pkill -f 'vite --host' 2>/dev/null || true
pkill -f 'sportplatform|api-gateway\.jar|identity-service\.jar|event-service\.jar' 2>/dev/null || true

COMPOSE=(docker compose)
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE=(sudo docker compose)
fi

if ! "${COMPOSE[@]}" ps >/dev/null 2>&1; then
  if ! pgrep -x dockerd >/dev/null 2>&1; then
    echo ">> Запуск dockerd ..."
    sudo dockerd >/tmp/dockerd.log 2>&1 &
    sleep 3
  fi
fi

# Host-сеть для Postgres и Java: стабильнее, чем bridge на части VM
HOST_OVERLAY=(-f docker-compose.host.yml)

"${COMPOSE[@]}" -f docker-compose.yml "${HOST_OVERLAY[@]}" down 2>/dev/null || true
"${COMPOSE[@]}" -f docker-compose.yml "${HOST_OVERLAY[@]}" up --build -d

echo
echo ">> Ожидание шлюза ..."
for _ in $(seq 1 60); do
  if curl -fs http://127.0.0.1:8080/actuator/health | grep -q UP; then break; fi
  sleep 2
done

"${COMPOSE[@]}" -f docker-compose.yml "${HOST_OVERLAY[@]}" ps
echo
echo "Готово: http://localhost:5173  ·  API: http://localhost:8080"
echo "Остановить: ${COMPOSE[*]} -f docker-compose.yml ${HOST_OVERLAY[*]} down"
