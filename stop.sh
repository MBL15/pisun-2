#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDS="$ROOT/backend/logs/pids.txt"
if [ -f "$PIDS" ]; then
  while read -r pid; do
    [ -n "$pid" ] && kill "$pid" 2>/dev/null
  done < "$PIDS"
  rm -f "$PIDS"
fi
# На случай «зомби» после сбоя: освобождаем порты сервисов
for port in 8081 8082 8083 8084 8080; do
  pids=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null || true
  fi
done
pkill -f "vite.*--host" 2>/dev/null || true
[ "${1:-}" = "--quiet" ] || echo "Все сервисы остановлены."
