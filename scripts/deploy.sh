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

# 备份数据库：服务运行在 WAL 模式下，直接 cp 主库文件会丢掉 -wal 中尚未 checkpoint 的写入。
# 优先用 sqlite3 的在线备份；没有 sqlite3 时退化为「先 checkpoint 再复制三件套」。
backup_db() {
  local db="$SHARED/data/time-theater.sqlite"
  local out="$SHARED/backups/time-theater-$RELEASE_ID.sqlite"
  [[ -f "$db" ]] || return 0
  if command -v sqlite3 >/dev/null 2>&1; then
    sqlite3 "$db" ".backup '$out'"
    echo "已备份数据库（sqlite3 .backup）：$out"
    return 0
  fi
  if command -v node >/dev/null 2>&1; then
    node -e "
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(process.argv[1]);
      db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
      db.close();
    " "$db" 2>/dev/null || true
  fi
  cp "$db" "$out"
  [[ -f "$db-wal" ]] && cp "$db-wal" "$out-wal"
  [[ -f "$db-shm" ]] && cp "$db-shm" "$out-shm"
  echo "已备份数据库（含 WAL 边车文件）：$out"
}

backup_db

mkdir -p "$RELEASE"
rsync -a --delete \
  --exclude '.git' \
  --exclude '.env' \
  --exclude 'node_modules' \
  --exclude 'server/data/*.sqlite*' \
  --exclude 'th/' \
  --exclude 'th_hutao/' \
  --exclude 'yy/' \
  --exclude 'images/characters/fulina/' \
  --exclude 'images/characters/hutao/' \
  --exclude 'images/characters/klee/' \
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

# 健康检查失败时自动回滚到上一版本（此前只能人工执行 scripts/rollback.sh）
if ! curl -fsS http://127.0.0.1:8787/api/v1/health/ready >/dev/null \
   || ! curl -fsS http://127.0.0.1:8787/index.html >/dev/null; then
  echo "健康检查失败，自动回滚" >&2
  if [[ -n "$PREVIOUS" && -d "$PREVIOUS" ]]; then
    ln -sfn "$PREVIOUS" "$ROOT/current.next"
    mv -Tf "$ROOT/current.next" "$CURRENT"
    systemctl restart time-theater.service || true
  fi
  echo "已回滚到：${PREVIOUS:-（无上一版本）}" >&2
  exit 1
fi

find "$ROOT/releases" -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\n' | sort -nr | tail -n +6 | cut -d' ' -f2- | xargs -r rm -rf

echo "发布完成：$RELEASE_ID"
if [[ -n "$PREVIOUS" ]]; then echo "上一版本：$PREVIOUS"; fi
