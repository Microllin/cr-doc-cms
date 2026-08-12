# CR Docs 部署说明（交付实施）

> CR Docs 是基于 Payload CMS + Next.js 的动态文档站：内容存 PostgreSQL，`/admin` 后台可视化编辑 Markdown，即改即生效。
> 本包为 **Docker Compose 自托管** 交付：现场机器只需装好 Docker，一条命令完成部署。

---

## 0. 前置要求

| 项 | 要求 |
|---|---|
| 操作系统 | Linux（x86_64），有外网可拉取镜像依赖 |
| Docker | Docker Engine 20+，且含 **Compose v2 插件**（`docker compose version` 能出版本） |
| 权限 | 当前用户能执行 `docker`（否则命令前加 `sudo`，或把用户加入 `docker` 组） |
| 端口 | 对外端口默认 `8300`，可改（见下）。确认该端口未被占用、防火墙已放行 |
| 资源 | **运行**约 2C2G 起步（`next start` 实测稳态 ~166MB + Postgres）；**构建**（`next build`）峰值吃内存，Node 堆上限设到 8G。低内存机请走 **§1B 镜像模式**：构建只在高配机做一次，部署机不构建 |

自检：
```bash
docker version && docker compose version && docker info >/dev/null && echo OK
```

---

## 1. 一键部署（推荐）

解压交付包后进入项目目录：

```bash
cd cr-docs-deploy-*/           # 解压出来的目录
./deploy.sh                    # 默认端口 8300，自带 Postgres，灌 3 篇示例文档
```

想指定端口 / 不要示例内容 / 改过代码重建：
```bash
WEB_PORT=80 ./deploy.sh        # 指定对外端口
./deploy.sh --no-seed          # 只建空站，不灌示例
./deploy.sh --rebuild          # 强制无缓存重建镜像
```

脚本会自动完成：**生成 `.env` 与随机密钥 → 构建镜像 → 起 Postgres+Web → 建表 → 灌示例 → 打印访问地址与管理员账号**。
结束后终端会打印形如：

```
文档前台 : http://<本机IP>:8300/docs/zh
后台管理 : http://<本机IP>:8300/admin
管理员   : admin@example.com
初始密码 : changeme123   ← 登录后请立即修改！
```

> ⚠️ **务必登录 `/admin` 后立即修改管理员密码**，不要在客户环境沿用默认值。
> 也可在部署前编辑 `.env` 的 `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` 设成客户指定账号。

---

## 1B. 镜像模式部署（部署机不构建，低内存 / 与他人同机推荐）

`next build` 内存要求高（Node 堆上限 8G），**不适合在低配部署机或已跑着其他服务的机器上构建**。镜像模式把构建挪到高配机做一次，部署机只 `docker load` + 起服务，**全程不 build**。

### 本次完整离线镜像

- 文件：`zenmux-docs-full-with-database.tar.gz`
- Web 镜像：`zenmux-docs-web:latest`
- 数据库镜像：`postgres:16-alpine`（包含首次启动导入的业务数据 SQL）

数据库镜像不保存默认账号、密码或数据库名。部署方必须在首次启动时提供：

```dotenv
POSTGRES_USER=<实际数据库用户>
POSTGRES_PASSWORD=<强随机密码>
POSTGRES_DB=<实际数据库名>
```

空数据库卷首次启动流程：PostgreSQL 官方入口根据以上变量创建账号和数据库，然后执行 `/docker-entrypoint-initdb.d/10-zenmux-data.sql` 导入文档数据。SQL 不创建账号密码；已有数据库卷不会再次执行导入。

### 部署步骤

```bash
sha256sum -c zenmux-docs-full-with-database.tar.gz.sha256
docker load < zenmux-docs-full-with-database.tar.gz

cp .env.example .env
# 编辑 .env，必须替换 POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB / PAYLOAD_SECRET
./deploy.sh --image --no-seed

docker compose ps
# db 和 web 均应显示 healthy
```

完整镜像包含当前文档和媒体文件，但刻意排除了后台管理员、会话、用户偏好和用户锁定数据，因此不要运行 seed。首次打开 `/admin` 会显示“创建第一个用户”，由部署者现场设置后台管理员邮箱和密码。`POSTGRES_USER` 是数据库账号，与后台管理员无关。

### 技术细节

- 数据导入仅发生在空的 `cr-docs_pgdata` 首次启动；已有卷优先，不会被镜像覆盖。
- 数据库健康检查：按运行时 `POSTGRES_USER` / `POSTGRES_DB` 执行 `pg_isready`。
- Web 健康检查：请求 `http://127.0.0.1:3000/admin`。
- `docker-compose.yml` 为 web/db 设置内存护栏（web `512m`、db `256m`）。
- 部署机若缺 Web 镜像，`--image` 会明确报错，不会触发源码构建。

### 如果需要重新构建镜像

**构建机（有内存的机器，一次性）：**
```bash
./deploy.sh                  # 首次会构建镜像（或 docker compose build web）
./save-image.sh              # 导出镜像 -> cr-docs-image.tar.gz（gzip 后约 260MB）
```

**打包交付件（构建机，可选一步到位）：**
```bash
tar -cf cr-docs-deploy-$(date +%Y%m%d).tar \
    cr-docs-image.tar.gz docker-compose.yml deploy.sh .env.example DEPLOY.md
```

---

```bash
cp .env.example .env
# 必改：POSTGRES_USER、POSTGRES_PASSWORD、POSTGRES_DB、PAYLOAD_SECRET
# 完整数据镜像部署应使用 ./deploy.sh --image --no-seed，不要重复灌 seed。

docker compose up -d --build                                   # 构建并启动
docker compose exec web node_modules/.bin/tsx scripts/seed.ts  # 灌示例（可选）
```

- 建表由容器启动时自动执行（`payload migrate`，见 `docker-entrypoint.sh`），无需手动跑迁移。
- 前台：`http://<服务器>:<WEB_PORT>/docs/zh`；后台：`.../admin`。

---

## 3. 关键配置（`.env`）

| 变量 | 说明 | 默认 |
|---|---|---|
| `WEB_PORT` | 对外访问端口 | `3000`（脚本默认写 `8300`） |
| `PAYLOAD_SECRET` | 会话/加密密钥，**必须随机**，脚本自动生成 | — |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | 空卷首次启动时创建的库凭据和数据库 | 均必填，无默认值 |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | 初始管理员 | `admin@example.com` / `changeme123` |

> 数据库为 **compose 自带**（服务名 `db`，容器 `cr-docs-db-1`），数据持久化在卷 `cr-docs_pgdata`。
> 无需客户提供数据库；如客户坚持用已有 PG，改 `web` 服务的 `DATABASE_URL` 指向外部库、并注释掉 `db` 服务即可（非默认场景，联系研发）。

---

## 4. 验证与运维

```bash
docker compose ps                 # 两个容器应为 running / healthy
curl -sI http://127.0.0.1:${WEB_PORT:-8300}/admin | head -1   # 期望 200
docker compose logs -f web        # 看应用日志

docker compose restart web        # 重启应用
docker compose down               # 停服务（保留数据卷）
docker compose up -d              # 再次拉起
```

**内容维护**：登录 `/admin` →「文档」新建/编辑（`title` / `slug` / Markdown `content`）→「侧边栏导航」拖拽决定左栏结构与上下页 →「站点设置」改站点名/Logo/描述。

---

## 5. 备份与迁移

内容全在数据库，图片在宿主 `./media`。备份两样即可：

```bash
# 备份：导出数据库 + 打包图片
docker compose exec -T db pg_dump -U payload -d crdocs --clean --if-exists | gzip > dump.sql.gz
tar czf media.tgz media

# 迁移到新机器：放好代码与 .env，先起 db，恢复数据+图片，再起 web
docker compose up -d db
gunzip -c dump.sql.gz | docker compose exec -T db psql -U payload -d crdocs -q
tar xzf media.tgz
docker compose up -d web
```

---

## 6. 常见问题

| 现象 | 处理 |
|---|---|
| `docker compose version` 报错 | 装的是老版 `docker-compose`（v1）。装 Compose v2 插件 |
| 部署脚本卡在“等待服务就绪” | `docker compose logs -f web` 看报错；多为数据库连不上或端口占用 |
| 浏览器打不开 | 确认 `WEB_PORT` 未被占用、防火墙放行、访问方与服务器同网段 |
| 站点是空的 | 未灌内容。跑 `docker compose exec web node_modules/.bin/tsx scripts/seed.ts`，或去 `/admin` 手动录入 |
| 登录后想改密码 | `/admin` → 右上角用户 → 修改密码 |
| 端口冲突要换端口 | 改 `.env` 的 `WEB_PORT` 后 `docker compose up -d` |
| 构建时 `JavaScript heap out of memory` / 部署机内存小 | 别在该机构建，走 **§1B 镜像模式**：高配机构建导出、部署机 `--image` 直接起 |

---

## 7. 打包给下一手（研发/交付内部用）

在开发机项目根目录执行，生成干净源码交付包：

```bash
./package.sh                 # 生成 ../cr-docs-deploy-YYYYMMDD.tar.gz
```

包内**不含**依赖、构建产物、本机 `.env`、已有图片——对方解压后 `cd` 进目录跑 `./deploy.sh` 即可（对方机器需能构建）。

**低内存 / 不希望对方构建**：改用 **§1B 镜像模式**——本机 `./save-image.sh` 导出镜像，连同 `docker-compose.yml`/`deploy.sh`/`.env.example`/`DEPLOY-IMAGE.txt` 打包，对方 `docker load` + `./deploy.sh --image`。
