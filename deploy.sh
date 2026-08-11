#!/usr/bin/env bash
# =============================================================================
# CR Docs 一键部署脚本（Docker Compose 自托管）
# -----------------------------------------------------------------------------
# 交付实施同事：在解压后的项目根目录执行 `./deploy.sh` 即可。
# 全程只需本机装好 Docker（含 compose 插件），其余自动完成：
#   生成 .env 与密钥 -> 构建镜像 -> 起 Postgres + Web -> 建表 -> 灌示例内容 -> 打印访问地址
#
# 常用参数：
#   ./deploy.sh                  # 默认端口 8300，自带 Postgres，灌 3 篇示例文档
#   WEB_PORT=80 ./deploy.sh      # 指定对外端口
#   ./deploy.sh --no-seed        # 只建空站，不灌示例文档
#   ./deploy.sh --rebuild        # 强制重新构建镜像（改过代码后用）
#   ./deploy.sh --image          # 不构建，直接用已 docker load 的镜像起（部署机推荐）
# =============================================================================
set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---- 参数 ----
DO_SEED=1
BUILD_FLAG="--build"
for arg in "$@"; do
  case "$arg" in
    --no-seed)  DO_SEED=0 ;;
    --rebuild)  BUILD_FLAG="--build --no-cache" ;;
    --image)    BUILD_FLAG="" ;;   # 镜像模式：跳过构建，用本地已有/已 load 的镜像
    -h|--help)  sed -n '2,21p' "$0"; exit 0 ;;
    *) echo "未知参数：$arg（-h 看帮助）" >&2; exit 1 ;;
  esac
done

log(){ printf '\033[1;36m[deploy]\033[0m %s\n' "$*"; }
die(){ printf '\033[1;31m[deploy][错误]\033[0m %s\n' "$*" >&2; exit 1; }

# ---- 1. 前置检查 ----
command -v docker >/dev/null 2>&1 || die "未找到 docker，请先安装 Docker Engine。"
docker compose version >/dev/null 2>&1 || die "未找到 docker compose 插件（需 Docker Compose v2）。"
docker info >/dev/null 2>&1 || die "Docker 守护进程不可用，请确认已启动且当前用户有权限（可能需 sudo 或加入 docker 组）。"

# ---- 2. 准备 .env ----
if [ ! -f .env ]; then
  log "未发现 .env，从 .env.example 生成……"
  cp .env.example .env
fi

# 2a. 生成 PAYLOAD_SECRET（仍是占位符则替换成随机值）
if grep -q 'PAYLOAD_SECRET=YOUR_SECRET_HERE' .env || ! grep -q '^PAYLOAD_SECRET=' .env; then
  SECRET="$(openssl rand -hex 32 2>/dev/null || head -c32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
  if grep -q '^PAYLOAD_SECRET=' .env; then
    sed -i "s|^PAYLOAD_SECRET=.*|PAYLOAD_SECRET=${SECRET}|" .env
  else
    printf '\nPAYLOAD_SECRET=%s\n' "$SECRET" >> .env
  fi
  log "已生成随机 PAYLOAD_SECRET。"
fi

# 2b. 端口：命令行 WEB_PORT 优先写入 .env
if [ -n "${WEB_PORT:-}" ]; then
  if grep -q '^WEB_PORT=' .env; then sed -i "s|^WEB_PORT=.*|WEB_PORT=${WEB_PORT}|" .env; else echo "WEB_PORT=${WEB_PORT}" >> .env; fi
fi

# 从 .env 读取生效值
PORT="$(grep -E '^WEB_PORT=' .env | tail -1 | cut -d= -f2)"; PORT="${PORT:-3000}"
ADMIN_EMAIL="$(grep -E '^SEED_ADMIN_EMAIL=' .env | tail -1 | cut -d= -f2)"; ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PW="$(grep -E '^SEED_ADMIN_PASSWORD=' .env | tail -1 | cut -d= -f2)"; ADMIN_PW="${ADMIN_PW:-changeme123}"

# ---- 3. 构建并启动 ----
if [ -z "$BUILD_FLAG" ]; then
  log "镜像模式：用本地已有镜像启动容器（Postgres + Web），不构建。"
  # 镜像模式下若本地缺镜像，提前明确报错，而非悄悄触发一次超重的构建
  IMG="$(grep -E '^WEB_IMAGE=' .env 2>/dev/null | tail -1 | cut -d= -f2)"; IMG="${IMG:-zenmux-docs-web:latest}"
  docker image inspect "$IMG" >/dev/null 2>&1 || \
    die "镜像模式需要本地已有镜像 ${IMG}。请先在构建机导出、在本机执行：docker load < cr-docs-image.tar.gz"
else
  log "构建镜像并启动容器（Postgres + Web）……首次构建约数分钟。"
fi
# shellcheck disable=SC2086
docker compose up -d $BUILD_FLAG

# ---- 4. 等待 Web 就绪 ----
log "等待服务就绪（探测 /admin）……"
READY=0
for i in $(seq 1 60); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://127.0.0.1:${PORT}/admin" || true)"
  if [ "$code" = "200" ]; then READY=1; break; fi
  sleep 3
done
[ "$READY" = "1" ] || die "服务 180s 内未就绪。查看日志：docker compose logs -f web"
log "服务已就绪。"

# ---- 5. 灌示例内容 ----
if [ "$DO_SEED" = "1" ]; then
  log "灌入示例文档 + 创建管理员（幂等，可重复执行）……"
  docker compose exec -T web node_modules/.bin/tsx scripts/seed.ts || \
    log "seed 执行有告警（若已灌过可忽略）。"
fi

# ---- 6. 访问信息 ----
LAN_IP="$(ip -4 addr show scope global 2>/dev/null | grep -oP 'inet \K[\d.]+' | grep -vE '^(172\.1[0-9]|172\.2[0-9]|172\.3[01])\.' | head -1 || true)"
LAN_IP="${LAN_IP:-<本机IP>}"
cat <<EOF

============================================================
  ✅ CR Docs 部署完成
------------------------------------------------------------
  文档前台 : http://${LAN_IP}:${PORT}/docs/zh
  后台管理 : http://${LAN_IP}:${PORT}/admin
  管理员   : ${ADMIN_EMAIL}
  初始密码 : ${ADMIN_PW}   ← 登录后请立即修改！
------------------------------------------------------------
  容器状态 : docker compose ps
  查看日志 : docker compose logs -f web
  停止服务 : docker compose down          （数据保留在卷 cr-docs_pgdata）
  彻底清库 : docker compose down -v        （⚠ 删除所有文档数据）
============================================================
EOF
