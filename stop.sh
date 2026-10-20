#!/usr/bin/env bash
PIDS="$(cd "$(dirname "$0")" && pwd)/backend/logs/pids.txt"
if [ ! -f "$PIDS" ]; then
  [ "${1:-}" = "--quiet" ] || echo "Запущенных сервисов не найдено."
  exit 0
fi
while read -r pid; do
  [ -n "$pid" ] && kill "$pid" 2>/dev/null
done < "$PIDS"
pkill -f "/backend/[^/]+-service/target/[^/]+-service.jar" 2>/dev/null || true
pkill -f "backend/api-gateway/target/api-gateway.jar" 2>/dev/null || true
# npm запускает vite дочерним процессом
pkill -f "vite.*--host" 2>/dev/null || true
rm -f "$PIDS"
[ "${1:-}" = "--quiet" ] || echo "Все сервисы остановлены."
