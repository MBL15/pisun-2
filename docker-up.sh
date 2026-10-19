#!/usr/bin/env bash
# Сборка и запуск всего стека в Docker (PostgreSQL + 5 сервисов + фронт).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

COMPOSE=(docker compose)
if ! docker info >/dev/null 2>&1; then
  COMPOSE=(sudo docker compose)
fi

if ! pgrep -x dockerd >/dev/null 2>&1; then
  echo ">> Запуск dockerd ..."
  sudo dockerd >/tmp/dockerd.log 2>&1 &
  sleep 4
fi

HOST_OVERLAY=(-f docker-compose.host.yml)

echo ">> Остановка прежнего Docker-стека ..."
"${COMPOSE[@]}" -f docker-compose.yml "${HOST_OVERLAY[@]}" down 2>/dev/null || true

echo ">> Остановка локальных jar/vite (не Docker) ..."
bash "$ROOT/stop.sh" --quiet 2>/dev/null || true
pkill -f 'vite --host' 2>/dev/null || true
pkill -f "$ROOT/backend/.*/target/.*\.jar" 2>/dev/null || true

echo ">> Сборка и запуск ..."
"${COMPOSE[@]}" -f docker-compose.yml "${HOST_OVERLAY[@]}" up --build -d

echo ">> Ожидание шлюза и API ..."
ok=false
for _ in $(seq 1 90); do
  if curl -fs http://127.0.0.1:8080/actuator/health 2>/dev/null | grep -q UP; then
    if curl -fs -H 'X-User-Id: 1' -H 'X-User-Role: USER' \
        http://127.0.0.1:8080/api/users/1 2>/dev/null | grep -q displayName; then
      ok=true
      break
    fi
  fi
  sleep 2
done

if [ "$ok" != true ]; then
  echo "!! Шлюз или identity не ответили вовремя. Логи: sudo docker compose logs identity-service api-gateway" >&2
  exit 1
fi

fe=$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:5173/ || echo 000)
if [ "$fe" != 200 ]; then
  echo "!! Фронт на :5173 вернул $fe" >&2
  exit 1
fi

"${COMPOSE[@]}" -f docker-compose.yml "${HOST_OVERLAY[@]}" ps
echo
echo "Готово:"
echo "  UI   → http://localhost:5173"
echo "  API  → http://localhost:8080"
echo "Стоп: sudo docker compose -f docker-compose.yml -f docker-compose.host.yml down"
