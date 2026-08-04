#!/usr/bin/env bash
set -euo pipefail

ROOT="${DEPLOY_ROOT:-/www/wwwroot/awkn-lab/game}"
RELEASE_ID="${RELEASE_ID:-$(date +%Y%m%d%H%M%S)}"
SOURCE="${SOURCE_DIR:-$(pwd)}"
RELEASE="$ROOT/releases/$RELEASE_ID"
SHARED="$ROOT/shared"
CURRENT="$ROOT/current"
PREVIOUS=""

mkdir -p "$ROOT/releases" "$SHARED/backups" "$SHARED/data" "$SHARED/logs"

if [[ -L "$CURRENT" ]]; then
  PREVIOUS="$(readlink -f "$CURRENT")"
fi

if [[ -f "$SHARED/data/time-theater.sqlite" ]]; then
  cp "$SHARED/data/time-theater.sqlite" "$SHARED/backups/time-theater-$RELEASE_ID.sqlite"
fi

mkdir -p "$RELEASE"
rsync -a --delete \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'node_modules' \
  --exclude 'server/data/*.sqlite*' \
  "$SOURCE/" "$RELEASE/"

cd "$RELEASE"
npm ci
npm run verify

if [[ ! -f "$SHARED/.env" ]]; then
  echo "缺少 $SHARED/.env，停止发布" >&2
  exit 1
fi

ln -sfn "$SHARED/.env" "$RELEASE/.env"
rm -rf "$RELEASE/server/data"
ln -sfn "$SHARED/data" "$RELEASE/server/data"

node server/db/migrate.js
ln -sfn "$RELEASE" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$CURRENT"

systemctl restart time-theater.service
sleep 2
curl -fsS http://127.0.0.1:8787/api/v1/health/ready >/dev/null
curl -fsS http://127.0.0.1:8787/ai-mvp.html >/dev/null

find "$ROOT/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +6 | cut -d' ' -f2- | xargs -r rm -rf

echo "发布完成：$RELEASE_ID"
if [[ -n "$PREVIOUS" ]]; then echo "上一版本：$PREVIOUS"; fi
