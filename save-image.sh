#!/usr/bin/env bash
# =============================================================================
# CR Docs 镜像导出脚本（在「构建机」/本地已 build 好的机器上执行）
# -----------------------------------------------------------------------------
# 作用：把本机已构建的 web 镜像打包成 tar.gz，拷到部署机 docker load 即可，
#       部署机全程无需 build（省内存、免 next build 的高内存要求）。
#
#   ./save-image.sh                 # 导出默认镜像 zenmux-docs-web:latest -> cr-docs-image.tar.gz
#   WEB_IMAGE=cr-docs-web:v1 ./save-image.sh   # 指定镜像名
#   OUT=/tmp/x.tar.gz ./save-image.sh          # 指定输出文件
# =============================================================================
set -euo pipefail
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

IMG="${WEB_IMAGE:-zenmux-docs-web:latest}"
OUT="${OUT:-cr-docs-image.tar.gz}"

log(){ printf '\033[1;36m[save-image]\033[0m %s\n' "$*"; }
die(){ printf '\033[1;31m[save-image][错误]\033[0m %s\n' "$*" >&2; exit 1; }

docker image inspect "$IMG" >/dev/null 2>&1 || \
  die "本机没有镜像 ${IMG}。先构建：docker compose build web（或 ./deploy.sh 首次会构建）。"

log "导出镜像 ${IMG} -> ${OUT}（约 1.5GB 未压缩，gzip 后通常 400~600MB，请稍候）……"
docker save "$IMG" | gzip > "$OUT"

SIZE="$(du -h "$OUT" | cut -f1)"
cat <<EOF

============================================================
  ✅ 镜像已导出：${OUT}（${SIZE}）
------------------------------------------------------------
  拷到部署机后，在部署机项目根目录执行：
    docker load < ${OUT}
    ./deploy.sh --image           # 不构建，直接用该镜像起
  （部署机只需 Docker + 本项目的 docker-compose.yml / deploy.sh / .env.example）
============================================================
EOF
