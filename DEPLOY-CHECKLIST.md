# ZenMux Docs 完整离线镜像部署检查清单

## 镜像文件

- `zenmux-docs-full-with-database.tar.gz`
- `zenmux-docs-full-with-database.tar.gz.sha256`
- 归档内镜像：`zenmux-docs-web:latest`、`postgres:16-alpine`

## 部署前

```bash
docker version
docker compose version
sha256sum -c zenmux-docs-full-with-database.tar.gz.sha256
docker load < zenmux-docs-full-with-database.tar.gz
```

必须在 `.env` 中填写真实值，不能保留占位符：

```dotenv
POSTGRES_USER=<实际数据库用户>
POSTGRES_PASSWORD=<强随机密码>
POSTGRES_DB=<实际数据库名>
PAYLOAD_SECRET=<openssl rand -hex 32 的结果>
```

镜像不包含默认数据库账号、密码或数据库名。不要直接运行不带环境变量的 PostgreSQL 容器；使用项目 Compose，或在 `docker run` 时明确传入上述三个 PostgreSQL 变量。

## 首次数据导入

数据库镜像通过 PostgreSQL 官方初始化机制工作：

1. 仅在数据库 volume 为空时，根据运行时变量初始化账号和数据库；
2. 随后执行 `/docker-entrypoint-initdb.d/10-zenmux-data.sql`；
3. SQL 导入文档、导航、设置和媒体元数据，但不导入后台管理员、会话、用户偏好或用户锁定数据，也不创建数据库角色或密码；
4. 已有 `cr-docs_pgdata` 时不会再次执行 SQL，现有数据不会被覆盖。

完整镜像还包含对应媒体文件。由于业务数据已经存在，启动时不要再运行 seed：

```bash
./deploy.sh --image --no-seed
```

## 上线验证

```bash
docker compose ps
# db 和 web 均应为 healthy

docker compose exec -T db sh -c \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select count(*) from docs"'

curl -fsS http://127.0.0.1:${WEB_PORT:-3000}/admin >/dev/null
curl -fsS http://127.0.0.1:${WEB_PORT:-3000}/search-index >/dev/null
```

预期数据基线：

- 正文文档：120
- 已排除的非正文目录：`audit/`（包括对应历史版本）
- 后台用户：0（首次访问 `/admin` 时现场创建）
- 媒体记录：86
- 媒体文件：86

首次访问 `/admin` 应显示“创建第一个用户”，由部署者现场设置管理员邮箱和密码。不要运行 seed，否则 seed 会自动创建管理员。`POSTGRES_USER` 是数据库账号，与后台管理员完全不同。
