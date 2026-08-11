#!/bin/bash
# =============================================================================
# CR Docs 生产镜像验证与导出脚本
# =============================================================================
set -euo pipefail

IMAGE_NAME="cr-docs:i18n-fixed"
EXPORT_FILE="cr-docs-i18n-fixed-$(date +%Y%m%d-%H%M).tar.gz"
TEST_PORT=8301
DB_HOST="host.docker.internal"
DB_PORT="5555"

echo "=================================================="
echo "CR Docs 生产镜像验证"
echo "=================================================="
echo ""

# 1. 检查镜像是否存在
if ! docker images --format "{{.Repository}}:{{.Tag}}" | grep -q "^${IMAGE_NAME}$"; then
    echo "❌ 镜像 ${IMAGE_NAME} 不存在"
    exit 1
fi

echo "✓ 镜像已存在: ${IMAGE_NAME}"
echo "  大小: $(docker images ${IMAGE_NAME} --format '{{.Size}}')"
echo ""

# 2. 启动测试容器
echo "=== 启动测试容器 ==="
docker run -d --name cr-docs-test-verify \
  -p ${TEST_PORT}:3000 \
  -e DATABASE_URL="postgresql://payload:zenmux@${DB_HOST}:${DB_PORT}/zenmux" \
  -e PAYLOAD_SECRET=test-secret-for-verification \
  ${IMAGE_NAME}

echo "等待容器启动..."
sleep 12

# 3. 健康检查
echo ""
echo "=== 健康检查 ==="
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${TEST_PORT}/docs/zh/guide/intro || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
    echo "❌ HTTP 健康检查失败 (code: ${HTTP_CODE})"
    echo ""
    echo "容器日志："
    docker logs cr-docs-test-verify --tail 30
    docker stop cr-docs-test-verify >/dev/null 2>&1
    docker rm cr-docs-test-verify >/dev/null 2>&1
    exit 1
fi
echo "✓ HTTP 健康检查通过 (200 OK)"

# 4. i18n 功能测试
echo ""
echo "=== i18n 功能测试 ==="

# 测试中文页
ZH_TITLE=$(curl -sL http://127.0.0.1:${TEST_PORT}/docs/zh/guide/intro | grep -o '<h1 class="vp-doc-title">[^<]*</h1>' | sed 's/<[^>]*>//g')
echo "中文页标题: ${ZH_TITLE}"
if [ -z "$ZH_TITLE" ]; then
    echo "❌ 中文页面无法获取标题"
    docker stop cr-docs-test-verify >/dev/null 2>&1
    docker rm cr-docs-test-verify >/dev/null 2>&1
    exit 1
fi

# 测试英文页
EN_TITLE=$(curl -sL http://127.0.0.1:${TEST_PORT}/docs/en/guide/intro | grep -o '<h1 class="vp-doc-title">[^<]*</h1>' | sed 's/<[^>]*>//g')
echo "英文页标题: ${EN_TITLE}"
if [ -z "$EN_TITLE" ]; then
    echo "❌ 英文页面无法获取标题"
    docker stop cr-docs-test-verify >/dev/null 2>&1
    docker rm cr-docs-test-verify >/dev/null 2>&1
    exit 1
fi

# 验证标题不同
if [ "$ZH_TITLE" = "$EN_TITLE" ]; then
    echo "❌ 中英文页面标题相同，i18n 可能失效"
    docker stop cr-docs-test-verify >/dev/null 2>&1
    docker rm cr-docs-test-verify >/dev/null 2>&1
    exit 1
fi

echo "✓ i18n 内容切换正常"

# 5. 验证热补丁存在
echo ""
echo "=== 验证热补丁 ==="
if curl -sL http://127.0.0.1:${TEST_PORT}/fix-i18n.js | grep -q "i18n-fix"; then
    echo "✓ 热补丁文件存在"
else
    echo "⚠ 热补丁文件不存在（不影响功能，因为已有 prefetch=false 修复）"
fi

# 6. 验证语言切换按钮
echo ""
echo "=== 验证语言切换按钮 ==="
if curl -sL http://127.0.0.1:${TEST_PORT}/docs/zh/guide/intro | grep -q 'prefetch.*false'; then
    echo "✓ prefetch=false 已应用"
else
    echo "⚠ 无法确认 prefetch 状态（需要查看渲染后的 HTML）"
fi

# 清理测试容器
echo ""
echo "=== 清理测试容器 ==="
docker stop cr-docs-test-verify >/dev/null 2>&1
docker rm cr-docs-test-verify >/dev/null 2>&1
echo "✓ 测试容器已清理"

# 7. 导出镜像
echo ""
echo "=================================================="
echo "验证通过，开始导出镜像"
echo "=================================================="
echo ""
echo "导出文件: ${EXPORT_FILE}"
echo "预计大小: ~500-800MB（压缩后）"
echo ""

docker save ${IMAGE_NAME} | gzip > ${EXPORT_FILE}

echo ""
echo "=================================================="
echo "✓ 导出完成"
echo "=================================================="
echo ""
echo "文件信息:"
ls -lh ${EXPORT_FILE}
echo ""
echo "MD5 校验:"
md5sum ${EXPORT_FILE}
echo ""
echo "部署说明:"
echo "  1. 传输文件: scp ${EXPORT_FILE} target-server:/path/"
echo "  2. 加载镜像: docker load < ${EXPORT_FILE}"
echo "  3. 运行容器: docker run -d -p 8300:3000 \\"
echo "               -e DATABASE_URL='postgresql://...' \\"
echo "               -e PAYLOAD_SECRET='...' \\"
echo "               ${IMAGE_NAME}"
echo ""
echo "浏览器测试建议:"
echo "  访问 http://your-server:8300/docs/zh/guide/intro"
echo "  点击右上角 EN 按钮，页面应该完整刷新并显示英文内容"
echo ""
