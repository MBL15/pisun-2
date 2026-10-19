#!/usr/bin/env bash
# Быстрый старт платформы одной командой (Linux/macOS, без Docker, БД H2 в файле backend/data).
#   ./start.sh            — собрать (если нужно) и запустить всё
#   ./start.sh --rebuild  — пересобрать бэкенд
#   ./start.sh --reset    — начать с чистыми демо-данными
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
LOGS="$BACKEND/logs"
DATA="$BACKEND/data"
SERVICES=("identity-service:8081" "event-service:8082" "ai-moderation-service:8083" "doc-generator-service:8084" "api-gateway:8080")

REBUILD=false
RESET=false
for arg in "$@"; do
  case "$arg" in
    --rebuild) REBUILD=true ;;
    --reset) RESET=true ;;
  esac
done

"$ROOT/stop.sh" --quiet || true

java_major() { "$1" -version 2>&1 | sed -n 's/.*version "\([0-9]*\).*/\1/p' | head -n1; }

JAVA_BIN=""
for candidate in "${JAVA_HOME:-}/bin/java" "$(command -v java || true)"; do
  if [ -x "$candidate" ] && [ "$(java_major "$candidate")" -ge 21 ] 2>/dev/null; then JAVA_BIN="$candidate"; break; fi
done
if [ -z "$JAVA_BIN" ]; then
  echo "Нужна Java 21+. Установите JDK 21 (например, Eclipse Temurin) и задайте JAVA_HOME." >&2
  exit 1
fi
export JAVA_HOME="$(cd "$(dirname "$JAVA_BIN")/.." && pwd)"
echo ">> Java: $JAVA_BIN"

need_build=$REBUILD
for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"
  [ -f "$BACKEND/$name/target/$name.jar" ] || need_build=true
done
if [ "$need_build" = true ]; then
  echo ">> Сборка бэкенда (Maven Wrapper) ..."
  (cd "$BACKEND" && chmod +x mvnw && ./mvnw -q -B -DskipTests package)
fi

mkdir -p "$LOGS" "$DATA"
if [ "$RESET" = true ]; then rm -f "$DATA"/sportdb*; fi
export SPORT_DATA_DIR="$DATA"
: > "$LOGS/pids.txt"

for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"; port="${entry##*:}"
  echo ">> Запуск $name (порт $port)"
  (cd "$BACKEND" && nohup "$JAVA_BIN" -Xms64m -Xmx384m -Dfile.encoding=UTF-8 -jar "$name/target/$name.jar" \
      > "$LOGS/$name.log" 2>&1 & echo $! >> "$LOGS/pids.txt")
  # Первый процесс становится хостом файловой H2 (AUTO_SERVER), остальные подключаются к нему
  if [ "$name" = "identity-service" ]; then sleep 6; fi
done

if [ -d "$FRONTEND" ]; then
  [ -d "$FRONTEND/node_modules" ] || (cd "$FRONTEND" && npm install)
  echo ">> Запуск фронтенда (порт 5173)"
  (cd "$FRONTEND" && nohup npm run dev -- --host > "$LOGS/frontend.log" 2>&1 & echo $! >> "$LOGS/pids.txt")
fi

echo ">> Ожидание готовности сервисов ..."
for entry in "${SERVICES[@]}"; do
  name="${entry%%:*}"; port="${entry##*:}"
  for _ in $(seq 1 90); do
    if curl -fs "http://localhost:$port/actuator/health" | grep -q UP; then break; fi
    sleep 2
  done
  if curl -fs "http://localhost:$port/actuator/health" | grep -q UP; then status=OK; else status="НЕ ОТВЕЧАЕТ — см. $LOGS/$name.log"; fi
  printf "   %-24s :%s  %s\n" "$name" "$port" "$status"
done

echo
echo "Готово! Приложение: http://localhost:5173  ·  API Gateway: http://localhost:8080  ·  Остановить: ./stop.sh"
