#!/usr/bin/env bash
set -euo pipefail

ROOT="${DEPLOY_ROOT:-/www/wwwroot/awkn-lab/game}"
TARGET="${1:-}"

if [[ -z "$TARGET" ]]; then
  echo "用法：scripts/rollback.sh <release-id>" >&2
  echo "可用版本：" >&2
  ls -1 "$ROOT/releases" | tail -20 >&2
  exit 1
fi

RELEASE="$ROOT/releases/$TARGET"
if [[ ! -d "$RELEASE" ]]; then
  echo "版本不存在：$RELEASE" >&2
  exit 1
fi

ln -sfn "$RELEASE" "$ROOT/current.next"
mv -Tf "$ROOT/current.next" "$ROOT/current"
systemctl restart time-theater.service
sleep 2
curl -fsS http://127.0.0.1:8787/api/v1/health/ready >/dev/null
curl -fsS http://127.0.0.1:8787/ai-mvp.html >/dev/null

echo "已回滚到：$TARGET"
