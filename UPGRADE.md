# CR-Docs 镜像升级指南

> 适用场景：已有运行中的 CR-Docs 实例，只需要替换 Web 镜像（修复 bug/新功能），保留所有数据和配置。

## 📦 升级包内容

- `cr-docs-image.tar.gz` (263MB) - 新版 Web 镜像
- `UPGRADE.md` (本文件) - 升级说明

## 🚀 升级步骤（3 步，30 秒完成）

```bash
# 1. 加载新镜像（会覆盖 zenmux-docs-web:latest）
docker load < cr-docs-image.tar.gz

# 2. 重启 Web 容器（数据库不动，数据不丢）
docker compose restart web

# 3. 验证
docker compose ps
# 看到 web 容器 STATUS 为 Up，说明升级成功
```

就这么简单！**不需要运行 deploy.sh，不需要初始化数据库，所有内容和配置都保留**。

## ✅ 验证升级

### 检查新功能是否生效

1. 浏览器访问文档站：`http://<服务器IP>:<端口>/docs/zh`
2. 按 F12 打开开发者工具 Console
3. 应该看到：`[i18n-fix] 语言切换补丁已生效`
4. 点击右上角语言切换（中/EN），页面应该完整刷新并正确切换

### 检查数据是否保留

1. 访问 `/admin`，用原密码登录
2. 所有文档内容应该完好无损

## 🔧 如果升级后有问题

### 回滚到旧版本

```bash
# 如果有备份旧镜像
docker load < cr-docs-image-old.tar.gz
docker compose restart web
```

### 从头排查

```bash
# 查看容器状态
docker compose ps

# 查看 Web 日志
docker compose logs -f web

# 重启所有服务（最后手段，会短暂中断服务）
docker compose restart
```

## 📊 本次升级内容

- **构建日期**: 2026-07-27
- **基于分支**: dev (commit 381d8afc9)
- **修复内容**:
  - ✅ Next.js Link `prefetch={false}` - 禁用预取缓存
  - ✅ i18n 热补丁 `/fix-i18n.js` - 强制硬跳转切换语言
  - ✅ 修复语言切换后内容不变的问题

## ⚠️ 注意事项

- ✅ **数据安全**: 升级只替换代码，不动数据库
- ✅ **停机时间**: 仅重启 Web 容器时的 5-10 秒
- ✅ **可回滚**: 如有问题可立即加载旧镜像回滚
- ⚠️ **首次升级**: 如果是全新部署（没有运行中的实例），请使用 `DEPLOY.md` 完整部署文档

## 🆚 升级 vs 全新部署

| 场景 | 使用文档 | 数据库 | 用时 |
|------|----------|--------|------|
| **已有实例，只换代码** | `UPGRADE.md` (本文件) | ✅ 保留 | 30秒 |
| **全新部署** | `DEPLOY.md` | 🆕 新建 | 5分钟 |

---

**简单总结：已有实例只需要 `docker load` + `docker compose restart web` 两条命令！**
