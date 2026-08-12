# ZenMux Docs 老版本服务全量替换指南

> 适用场景：目标机器上已经运行老版本文档站，但**不保留老数据库和老媒体文件**，直接使用 `zenmux-docs-full-with-database.tar.gz` 中的新程序和新数据。
>
> ⚠️ 本操作会永久删除老数据库卷和老媒体目录。不要执行数据库恢复，也不要运行 seed。

## 1. 本次替换后的数据

完整镜像归档包含：

```text
zenmux-docs-web:latest
postgres:16-alpine
```

新数据基线：

- 正文文档：120 篇；
- 媒体记录：86 条；
- 媒体文件：86 个；
- `audit/`、`aduit/` 非正文内容：0；
- 后台管理员：0，首次访问后台时现场创建。

PostgreSQL 镜像不内置数据库账号、密码或数据库名。部署时必须自行设置 `POSTGRES_USER`、`POSTGRES_PASSWORD` 和 `POSTGRES_DB`。

## 2. 需要放到目标机器的文件

当前镜像归档 SHA256：

```text
c2ffb212361be7276f26c6357177feb72f939756aba038e3d60babec95a0e1a4
```

将以下文件放入老服务所在目录：

```text
zenmux-docs-full-with-database.tar.gz
zenmux-docs-full-with-database.tar.gz.sha256
docker-compose.yml
deploy.sh
.env.example
```

必须使用本次交付的新版 `docker-compose.yml` 和 `deploy.sh`，不要继续使用老版本文件。

## 3. 停止老服务

进入老服务目录：

```bash
cd /path/to/zenmux-docs

docker compose ps
docker compose down -v --remove-orphans
```

`-v` 会删除当前 Compose 项目声明的老数据库卷。

本项目固定 Compose 项目名为 `cr-docs`，正常情况下数据库卷名是：

```text
cr-docs_pgdata
```

确认并删除可能残留的老卷：

```bash
docker volume ls | grep cr-docs || true
docker volume rm cr-docs_pgdata 2>/dev/null || true
```

如果机器上的老服务使用了其他 Compose 项目名，先通过以下命令确认对应数据卷，再删除该老服务的数据库卷：

```bash
docker volume ls
```

不要删除同机其他系统使用的卷。

## 4. 删除老媒体文件

Web 服务使用宿主机 `./media` 目录持久化图片。若老目录不为空，它会遮住镜像内的新媒体文件，因此全量替换时必须清空。

```bash
rm -rf ./media
mkdir -p ./media
```

不要把老媒体压缩包恢复到该目录。新 Web 镜像首次启动时会自动将随镜像提供的 86 个媒体文件复制到空的 `./media`。

## 5. 校验并加载新镜像

```bash
sha256sum -c zenmux-docs-full-with-database.tar.gz.sha256
docker load < zenmux-docs-full-with-database.tar.gz
```

确认两个镜像均已加载：

```bash
docker image inspect zenmux-docs-web:latest >/dev/null
docker image inspect postgres:16-alpine >/dev/null
docker images | grep -E 'zenmux-docs-web|postgres'
```

仅执行 `docker load` 不会替换正在运行的老容器，因此必须先执行前面的 `docker compose down -v`，随后重新创建容器。

## 6. 重新配置环境变量

不要直接沿用老 `.env`。先重新生成：

```bash
rm -f .env
cp .env.example .env
```

然后编辑 `.env`。下面这几项就是你必须填写的内容：

```dotenv
# 数据库账号。随便起一个名字，例如 docs
POSTGRES_USER=docs

# 数据库密码。自己设置一串复杂密码，例如 DocsPass_2026_Strong
POSTGRES_PASSWORD=DocsPass_2026_Strong

# 数据库名字。随便起一个名字，例如 docsdb
POSTGRES_DB=docsdb

# 网站自己的安全密钥。填写一串较长的随机字符串，不能留空
PAYLOAD_SECRET=ZenmuxDocsSecret_2026_Long_Random_String

# 网站端口。一般不用改
WEB_PORT=8300

# 你从哪里打开后台，就写哪里。
# 假设服务器 IP 是 192.168.1.100，就写：
ADMIN_ORIGINS=http://192.168.1.100:8300

# 使用刚刚加载的新 Web 镜像
WEB_IMAGE=zenmux-docs-web:latest
```

### 这些配置分别是什么？

简单理解：

- `POSTGRES_USER`、`POSTGRES_PASSWORD`、`POSTGRES_DB`：**数据库的账号、密码和名字**。它们不是文档后台的登录账号。
- `PAYLOAD_SECRET`：网站用来保护登录会话的安全密钥，写长一些即可，不要留空。
- `ADMIN_ORIGINS`：告诉网站“允许从哪个网址登录后台”。如果服务器 IP 是 `192.168.1.100`，端口是 `8300`，就写 `http://192.168.1.100:8300`。

### 不填写会怎样？

- 不填 `POSTGRES_USER`：数据库启动不了；
- 不填 `POSTGRES_PASSWORD`：数据库启动不了；
- 不填 `POSTGRES_DB`：数据库启动不了；
- 不填 `PAYLOAD_SECRET`：Web 网站启动不了；
- 不填 `ADMIN_ORIGINS`：本机访问可能没问题，但从服务器 IP 或域名登录后台后，可能又被退回登录页面。

所以最简单的做法是：**上面 5 项全部填写，不要留空，也不要保留 `CHANGE_ME`。**

注意：数据库密码和后台密码是两套密码。后台密码不是在 `.env` 里设置，而是在服务启动后打开 `/admin`，看到“创建第一个用户”页面后现场设置。

## 7. 启动新服务

推荐执行：

```bash
./deploy.sh --image --no-seed
```

也可以直接使用 Compose：

```bash
docker compose up -d --no-build --force-recreate
```

必须满足：

- 使用 `--image` 或 `--no-build`，避免在部署机重新构建；
- 使用 `--no-seed`，不要自动创建默认管理员或示例文档；
- 数据库必须使用刚创建的空卷，才能执行新镜像中的数据 SQL。

首次启动流程：

1. PostgreSQL 根据 `.env` 创建数据库账号和数据库；
2. 自动执行 `/docker-entrypoint-initdb.d/10-zenmux-data.sql`；
3. 导入 120 篇正文、导航、站点设置和 86 条媒体记录；
4. Web 执行 Payload migration；
5. Web 将 86 个媒体文件复制到空的 `./media`；
6. 后台保持无用户状态，等待现场创建首个管理员。

## 8. 检查容器健康状态

```bash
docker compose ps
```

预期：

```text
cr-docs-db-1    healthy
cr-docs-web-1   healthy
```

若还在 `starting`，等待约 30 秒后重新检查：

```bash
sleep 30
docker compose ps
```

查看日志：

```bash
docker compose logs --tail=200 db
docker compose logs --tail=200 web
```

数据库首次启动日志应包含：

```text
running /docker-entrypoint-initdb.d/10-zenmux-data.sql
PostgreSQL init process complete
```

## 9. 验证新数据

```bash
docker compose exec -T db sh -lc '
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "
select '\''docs='\'' || count(*) from docs;
select '\''audit_docs='\'' || count(*) from docs
  where slug ilike '\''audit/%'\'' or slug ilike '\''aduit/%'\'';
select '\''users='\'' || count(*) from users;
select '\''media='\'' || count(*) from media;
"'
```

预期：

```text
docs=120
audit_docs=0
users=0
media=86
```

检查媒体文件数量：

```bash
docker compose exec -T web sh -lc 'find /app/media -type f | wc -l'
```

预期：

```text
86
```

检查 HTTP：

```bash
curl -fsS http://127.0.0.1:${WEB_PORT:-8300}/search-index >/dev/null
curl -fsS http://127.0.0.1:${WEB_PORT:-8300}/admin >/dev/null
curl -fsSL http://127.0.0.1:${WEB_PORT:-8300}/docs/zh >/dev/null
curl -fsSL http://127.0.0.1:${WEB_PORT:-8300}/docs/en >/dev/null
```

## 10. 创建首个后台管理员

浏览器打开：

```text
http://<服务器IP或域名>:<WEB_PORT>/admin
```

页面应显示：

```text
创建第一个用户
```

现场填写管理员邮箱和强密码。创建完成后再登录后台检查文档、导航和站点设置。

如果打开的是登录页而不是“创建第一个用户”，说明当前数据库中已有用户，通常是以下原因之一：

1. 老数据库卷没有删除；
2. 启动时挂载了错误的数据卷；
3. 误执行了 `scripts/seed.ts`；
4. 使用的不是本次数据库镜像。

可检查：

```bash
docker compose exec -T db sh -lc \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "select count(*) from users"'
```

首次设置前必须返回 `0`。

## 11. 常见问题

### 数据库没有导入新数据

检查是否复用了老卷：

```bash
docker inspect cr-docs-db-1 --format '{{json .Mounts}}'
docker volume ls | grep cr-docs
```

SQL 只在空数据库目录首次启动时执行。确认不需要老数据后重新初始化：

```bash
docker compose down -v --remove-orphans
docker volume rm cr-docs_pgdata 2>/dev/null || true
docker compose up -d --no-build --force-recreate
```

### 图片返回 404 或 500

确认老媒体目录已清空，并让 Web 镜像重新初始化媒体目录：

```bash
docker compose down
rm -rf ./media
mkdir -p ./media
docker compose up -d --no-build --force-recreate
```

### 容器仍使用老镜像

```bash
docker load < zenmux-docs-full-with-database.tar.gz
docker compose down
docker compose up -d --no-build --force-recreate
docker inspect cr-docs-web-1 --format '{{.Image}}'
docker inspect cr-docs-db-1 --format '{{.Image}}'
```

### 后台登录后又跳回登录页

检查 `.env` 的 `ADMIN_ORIGINS` 是否包含浏览器实际访问来源，包括协议和端口，例如：

```dotenv
ADMIN_ORIGINS=http://192.168.1.20:8300,https://docs.example.com
```

修改后重建 Web 容器：

```bash
docker compose up -d --no-build --force-recreate web
```

## 12. 最终验收清单

- [ ] 老服务容器已停止并删除；
- [ ] 老数据库卷已删除；
- [ ] 老 `./media` 已清空；
- [ ] 新归档 SHA256 校验通过；
- [ ] 两个新镜像加载成功；
- [ ] `.env` 已设置真实数据库凭据和 Payload 密钥；
- [ ] 启动时未运行 seed；
- [ ] DB 和 Web 均为 `healthy`；
- [ ] 正文数量为 120；
- [ ] `audit/aduit` 数量为 0；
- [ ] 后台用户数量为 0；
- [ ] 媒体记录和媒体文件均为 86；
- [ ] `/admin` 显示“创建第一个用户”；
- [ ] 已现场创建新的后台管理员。
