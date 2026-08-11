# CR-Docs 镜像部署清单

## 📦 交付文件

- ✅ `cr-docs-image.tar.gz` (263MB) - Docker 镜像
- ✅ `docker-compose.yml` - 服务编排配置
- ✅ `deploy.sh` - 一键部署脚本
- ✅ `.env.example` - 环境变量模板
- ✅ `DEPLOY.md` - 完整部署文档

## 🔧 部署前检查

```bash
# 1. 检查 Docker 环境
docker version && docker compose version

# 2. 检查端口（默认 8300）
netstat -tuln | grep 8300 || echo "端口可用"

# 3. 检查磁盘空间（至少 5GB）
df -h .
```

## 🚀 快速部署（3 步）

```bash
# 1. 加载镜像
docker load < cr-docs-image.tar.gz

# 2. 启动服务
./deploy.sh --image

# 3. 浏览器访问
# 前台: http://<服务器IP>:8300/docs/zh
# 后台: http://<服务器IP>:8300/admin
```

## ✅ 验证 i18n 修复

1. 打开浏览器访问文档站
2. 按 F12 打开开发者工具，切到 Console 标签
3. 应该看到：`[i18n-fix] 语言切换补丁已生效`
4. 点击右上角语言切换按钮（中/EN）
5. **预期行为**：页面完整刷新（地址栏会闪一下），内容正确切换
6. **错误行为**：URL 变了但内容没变 = 修复未生效

## 📞 问题排查

### 问题 1：镜像加载失败
```bash
# 检查文件完整性
ls -lh cr-docs-image.tar.gz
md5sum cr-docs-image.tar.gz
```

### 问题 2：数据库连接失败
```bash
# 检查数据库容器
docker compose ps db
docker compose logs db

# 手动创建数据库（如果需要）
docker compose exec db psql -U payload -d postgres -c "CREATE DATABASE crdocs;"
```

### 问题 3：热补丁不生效
```bash
# 验证热补丁文件存在
curl http://127.0.0.1:8300/fix-i18n.js

# 检查返回内容应该包含
# "i18n 语言切换热补丁"
```

### 问题 4：页面 404
```bash
# 检查是否导入了种子数据
docker compose exec db psql -U payload -d crdocs -c "SELECT COUNT(*) FROM docs;"

# 如果返回 0，手动导入
docker compose exec web pnpm tsx scripts/seed.ts
```

## 🔐 安全提醒

⚠️ **首次登录后必须修改管理员密码**

默认账号：
- 邮箱：`admin@example.com`
- 密码：`changeme123`

登录后立即修改：
1. 访问 `/admin`
2. 右上角用户图标 → Account → Change Password

## 📊 资源使用

- CPU：1-2 核（运行时）
- 内存：512MB（Web）+ 256MB（DB）
- 磁盘：~2GB（镜像 + 数据）

## 📝 版本信息

- 构建日期：2026-07-27
- 基于分支：dev (commit 381d8afc9)
- 镜像标签：zenmux-docs-web:latest
- 修复内容：i18n 语言切换问题
