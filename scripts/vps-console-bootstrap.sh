#!/usr/bin/env bash
# Запуск из веб-консоли VPS (ubuntu), если нет SSH с вашего ПК.
#   curl -fsSL "https://raw.githubusercontent.com/MBL15/pisun-2/cursor/vps-deploy-dbe4/scripts/vps-console-bootstrap.sh" | bash
set -euo pipefail

REPO="${SPORT_REPO:-https://github.com/MBL15/pisun-2.git}"
BRANCH="${SPORT_BRANCH:-cursor/vps-deploy-dbe4}"
DIR="${SPORT_DIR:-/opt/sportvmeste}"

if ! command -v git >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq git ca-certificates curl
fi
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "${USER:-ubuntu}" || true
fi

sudo mkdir -p "$DIR"
sudo chown -R "$(whoami):$(whoami)" "$DIR"
if [[ ! -d "$DIR/.git" ]]; then
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$DIR"
else
  git -C "$DIR" fetch origin "$BRANCH"
  git -C "$DIR" checkout "$BRANCH"
  git -C "$DIR" pull --ff-only origin "$BRANCH" || true
fi

cd "$DIR"
if [[ ! -f .env ]]; then
  echo "Создайте .env (см. env.example) с ключами VITE_YANDEX_* и повторите:" >&2
  echo "  docker compose --env-file .env -f docker-compose.yml -f docker-compose.vps.yml up -d --build" >&2
  exit 1
fi

export DOCKER_BUILDKIT=1
docker compose --env-file .env -f docker-compose.yml -f docker-compose.vps.yml up -d --build

echo "Готово: http://$(curl -fsS ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')/"
