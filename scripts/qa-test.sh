#!/usr/bin/env bash
# CR Docs 全量 QA：隔离 PostgreSQL + migration + seed + Vitest + Playwright。
# 不连接、不修改现有开发/生产数据库。
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PG_NAME="${QA_PG_NAME:-crdocs-qa-pg-run}"
PG_PORT="${QA_PG_PORT:-55433}"
WEB_PORT="${QA_WEB_PORT:-3411}"
DB_URL="postgres://payload:payload@127.0.0.1:${PG_PORT}/crdocsqa"
BASE_URL="http://127.0.0.1:${WEB_PORT}"
LOG_FILE="${TMPDIR:-/tmp}/crdocs-qa-web.log"
WEB_PID=""

cleanup() {
  if [ -n "$WEB_PID" ]; then
    kill -- "-$WEB_PID" >/dev/null 2>&1 || true
    kill "$WEB_PID" >/dev/null 2>&1 || true
  fi
  docker rm -f "$PG_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo '[qa] 启动隔离 PostgreSQL…'
docker rm -f "$PG_NAME" >/dev/null 2>&1 || true
docker run -d --name "$PG_NAME" \
  -e POSTGRES_USER=payload \
  -e POSTGRES_PASSWORD=payload \
  -e POSTGRES_DB=crdocsqa \
  -p "${PG_PORT}:5432" postgres:16-alpine >/dev/null

PG_READY=0
for _ in $(seq 1 60); do
  if docker exec "$PG_NAME" pg_isready -U payload -d crdocsqa >/dev/null 2>&1; then
    PG_READY=1
    break
  fi
  sleep 1
done
[ "$PG_READY" = '1' ] || { echo '[qa] PostgreSQL 启动失败' >&2; exit 1; }

export DATABASE_URL="$DB_URL"
export PAYLOAD_SECRET='qa-only-secret'
export SEED_ADMIN_EMAIL='qa@example.com'
export SEED_ADMIN_PASSWORD='qa-password'
export QA_ADMIN_EMAIL="$SEED_ADMIN_EMAIL"
export QA_ADMIN_PASSWORD="$SEED_ADMIN_PASSWORD"
export E2E_BASE_URL="$BASE_URL"
export E2E_ALLOW_MUTATION=1
# 隔离数据库已经就绪，真实 Payload Local API 测试不应继续跳过。
export RUN_DB_TESTS=1
export ADMIN_ORIGINS="$BASE_URL"

echo '[qa] 迁移并灌入基准数据…'
pnpm payload migrate
pnpm tsx scripts/seed.ts

echo '[qa] 静态检查与逻辑/接口异常测试…'
pnpm exec tsc --noEmit
pnpm lint
pnpm test:int

echo '[qa] 启动测试站点…'
rm -f .next/dev/lock
setsid pnpm dev --hostname 127.0.0.1 --port "$WEB_PORT" >"$LOG_FILE" 2>&1 &
WEB_PID=$!
for _ in $(seq 1 90); do
  if curl -fsS "$BASE_URL/docs/zh" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$WEB_PID" >/dev/null 2>&1; then
    tail -100 "$LOG_FILE" >&2
    exit 1
  fi
  sleep 1
done
curl -fsS "$BASE_URL/docs/zh" >/dev/null || { tail -100 "$LOG_FILE" >&2; exit 1; }

echo '[qa] 浏览器 E2E（前台、后台、导入、发布、多语言、空站）…'
pnpm exec playwright test --project=chromium --workers=1 --reporter=line

echo '[qa] 停止开发服务器并执行生产构建…'
kill -- "-$WEB_PID" >/dev/null 2>&1 || true
kill "$WEB_PID" >/dev/null 2>&1 || true
wait "$WEB_PID" >/dev/null 2>&1 || true
WEB_PID=""
pnpm build

echo '[qa] ✅ 全量 QA 通过'
