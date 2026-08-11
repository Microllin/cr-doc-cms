# CR-Docs 镜像升级包

## 快速升级（已有实例）

如果你已经有运行中的 CR-Docs，只需要：

```bash
docker load < cr-docs-image.tar.gz
docker compose restart web
```

30 秒完成，数据不丢。

详细说明见 UPGRADE.md


## 全新部署（第一次安装）

如果是第一次部署，需要：

```bash
docker load < cr-docs-image.tar.gz
./deploy.sh --image
```

5 分钟完成，会自动创建数据库和示例内容。

详细说明见 DEPLOY.md

---

本次更新：修复 i18n 语言切换问题
构建日期：2026-07-27
