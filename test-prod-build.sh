#!/bin/bash
set -e
echo "=== 停止 dev 容器 ==="
docker compose down

echo "=== 构建生产镜像 ==="
docker build -t cr-docs:test-i18n-fix .

echo "=== 启动生产容器 ==="
docker run -d --name cr-docs-test \
  -p 8301:3000 \
  -e DATABASE_URL="postgresql://payload:zenmux@host.docker.internal:5555/zenmux" \
  -e PAYLOAD_SECRET=test-secret \
  cr-docs:test-i18n-fix

echo "=== 等待启动 ==="
sleep 10

echo "=== 测试中文页 ==="
curl -sL http://127.0.0.1:8301/docs/zh/guide/intro | grep -o '<h1 class="vp-doc-title">[^<]*</h1>'

echo "=== 测试英文页 ==="
curl -sL http://127.0.0.1:8301/docs/en/guide/intro | grep -o '<h1 class="vp-doc-title">[^<]*</h1>'

echo ""
echo "=== 测试完成 ==="
echo "浏览器访问 http://127.0.0.1:8301/docs/zh/guide/intro"
echo "点击右上角 EN 按钮，看页面是否切换到英文"
echo ""
echo "测试完后执行：docker stop cr-docs-test && docker rm cr-docs-test && docker compose up -d"
