#!/usr/bin/env bash
# Деплой «СпортВместе» на VPS по SSH (rsync + docker compose).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOST="${DEPLOY_HOST:-195.209.212.77}"
USER="${DEPLOY_USER:-ubuntu}"
REMOTE_DIR="${DEPLOY_PATH:-/opt/sportvmeste}"
SSH_KEY_PATH="${DEPLOY_SSH_KEY_FILE:-}"
SSH_KEY_INLINE="${DEPLOY_SSH_KEY:-}"

if [[ -z "$SSH_KEY_PATH" ]]; then
  for candidate in "$HOME/privatekey-1154735.pem" "$HOME/.ssh/vps.pem" "$ROOT/privatekey-1154735.pem"; do
    if [[ -f "$candidate" ]]; then
      SSH_KEY_PATH="$candidate"
      break
    fi
  done
fi

if [[ -z "$SSH_KEY_PATH" && -n "$SSH_KEY_INLINE" ]]; then
  if [[ -f "$SSH_KEY_INLINE" ]]; then
    SSH_KEY_PATH="$SSH_KEY_INLINE"
  else
    SSH_KEY_PATH="$(mktemp)"
    trap 'rm -f "$SSH_KEY_PATH"' EXIT
    printf '%s\n' "$SSH_KEY_INLINE" >"$SSH_KEY_PATH"
  fi
fi

if [[ -z "$SSH_KEY_PATH" || ! -f "$SSH_KEY_PATH" ]]; then
  echo "Укажите ключ: export DEPLOY_SSH_KEY_FILE=/path/to/privatekey.pem или DEPLOY_SSH_KEY=\"\$(cat key.pem)\"" >&2
  exit 1
fi

chmod 600 "$SSH_KEY_PATH"
SSH=(ssh -i "$SSH_KEY_PATH" -o StrictHostKeyChecking=accept-new "${USER}@${HOST}")
RSYNC=(rsync -az --delete -e "ssh -i $SSH_KEY_PATH -o StrictHostKeyChecking=accept-new")

echo "==> Проверка SSH (${USER}@${HOST})"
"${SSH[@]}" 'echo ok'

echo "==> Подготовка сервера (Docker, swap при нехватке RAM)"
"${SSH[@]}" bash -s <<'REMOTE_BOOT'
set -euo pipefail
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq ca-certificates curl
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi
if ! docker compose version >/dev/null 2>&1; then
  sudo apt-get install -y -qq docker-compose-plugin || true
fi
TOTAL_SWAP=$(awk '/SwapTotal/ {print $2}' /proc/meminfo)
if [[ "${TOTAL_SWAP:-0}" -lt 1048576 ]]; then
  if [[ ! -f /swapfile ]]; then
    sudo fallocate -l 2G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  fi
fi
REMOTE_BOOT

echo "==> Синхронизация проекта в ${REMOTE_DIR}"
"${SSH[@]}" "sudo mkdir -p '$REMOTE_DIR' && sudo chown -R '$USER:$USER' '$REMOTE_DIR'"
"${RSYNC[@]}" \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'frontend/node_modules' \
  --exclude 'backend/**/target' \
  --exclude 'backend/data' \
  --exclude 'backend/logs' \
  --exclude '.tools' \
  "$ROOT/" "${USER}@${HOST}:${REMOTE_DIR}/"

echo "==> Сборка и запуск контейнеров (это может занять 15–30 мин на слабом VPS)"
"${SSH[@]}" bash -s <<REMOTE_UP
set -euo pipefail
cd '$REMOTE_DIR'
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
docker compose -f docker-compose.yml -f docker-compose.vps.yml build --parallel 2
docker compose -f docker-compose.yml -f docker-compose.vps.yml up -d
docker compose -f docker-compose.yml -f docker-compose.vps.yml ps
REMOTE_UP

echo ""
echo "Готово. Откройте: http://${HOST}/"
echo "Шлюз API (если нужен напрямую): http://${HOST}:8080/"
