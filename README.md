# CR Docs

基于 **Payload CMS 3、Next.js 16 和 PostgreSQL** 的自托管动态文档站。

CR Docs 提供 Markdown 内容管理后台和 VitePress 风格阅读前台。文档保存在 PostgreSQL，编辑或发布后无需重新构建站点；支持中英文内容、草稿审核、文件夹批量导入、图片自动入库、全文搜索、深浅主题和层级导航。

> 本仓库只包含文档站和文档管理后台，不包含其他产品门户或门户内容管理功能。

## 功能

### 文档前台

- VitePress 风格三栏布局：侧边栏、正文、页内目录
- GFM Markdown、表格、任务列表和代码块
- Shiki 双主题代码高亮
- 标题锚点与右侧 TOC
- 上一篇 / 下一篇导航
- `Ctrl/⌘ + K` 本地全文搜索
- 深色 / 浅色主题
- 中文和英文站点
- 缺少目标语言内容时禁用语言入口，不使用中文冒充英文
- 文档删除或取消发布后，旧地址返回当前语言文档首页
- 空数据库和全部取消发布时显示正常空状态

### 管理后台

- Payload CMS 管理后台：`/admin`
- Markdown 在线编辑
- 草稿、发布、取消发布和版本记录
- 文档、媒体、侧边栏导航和站点设置
- 中英文内容语言与后台界面语言同步切换
- 批量发布、取消发布和删除
- Markdown 单文件或整个文件夹导入

### Markdown 导入

导入器支持：

- `.md` 和 `.markdown`
- 选择多个文件或整个文件夹
- 保留目录结构并生成层级 slug
- 自动剥离所选文件夹的公共根目录
- 解析 `title`、`slug` 和 `excerpt` frontmatter
- 自动提取第一个一级标题作为标题
- 自动上传并重写本地图片引用
- 按 SHA-256 复用相同图片
- 重写相对 `.md` 链接为文档站 URL
- Unicode 文件名和 slug
- 预演模式，不写入数据库
- 已有 slug 可选择覆盖或跳过
- 单篇失败不影响同批其他文档
- 文档写入失败时补偿删除本篇新建媒体

**导入默认始终为草稿。** 只有在表单中明确选择“已发布”，文档才会直接上线。文件夹导入和单文件导入遵循相同规则。

根目录的 `README.md` 或 `index.md` 会映射为 `index`；目录内的 `guide/README.md` 会映射为 `guide`。同一批次中若多个文件生成相同 slug，导入器会明确报错，不会静默覆盖。

## 技术栈

| 层 | 技术 |
| --- | --- |
| Web 与管理后台 | Next.js 16 App Router、React 19、Payload CMS 3 |
| 数据库 | PostgreSQL 16、`@payloadcms/db-postgres` |
| Markdown | unified、remark-gfm、rehype |
| 代码高亮 | Shiki、rehype-pretty-code |
| 搜索 | MiniSearch、cmdk |
| 主题 | next-themes |
| 测试 | Vitest、Playwright |
| 部署 | Docker、Docker Compose v2 |

## 项目结构

```text
src/
├── app/
│   ├── (frontend)/                 # 文档前台
│   │   ├── docs/[[...slug]]/       # 动态文档路由
│   │   ├── search-index/           # 已发布文档搜索索引
│   │   ├── _components/            # 导航、搜索、TOC、翻页、主题
│   │   └── _lib/                   # Markdown、locale、导航查询
│   └── (payload)/                  # Payload 后台和 API
├── collections/
│   ├── Docs.ts                     # 文档、草稿、localized 字段
│   ├── Media.ts                    # 图片与 SHA-256 去重
│   └── Users.ts                    # 后台用户
├── globals/
│   ├── Navigation.ts               # 侧边栏结构
│   └── Settings.ts                 # 站点名称、Logo、favicon、SEO
├── components/                     # Markdown 导入和后台扩展
├── endpoints/importMarkdown.ts     # Markdown 导入 API
├── migrations/                     # 生产数据库迁移
└── payload.config.ts               # Payload 配置

scripts/
├── seed.ts                         # 管理员、示例文档和导航
└── qa-test.sh                      # 隔离数据库全链路 QA

deploy.sh                           # Docker Compose 部署
save-image.sh                       # 导出预构建镜像
Dockerfile
docker-compose.yml
```

## 环境要求

### 本地开发

- Node.js `18.20.2+`，推荐 Node.js 22
- pnpm 9、10 或 11
- PostgreSQL 16
- Docker（可选，用于启动 PostgreSQL 和运行完整 QA）

### 生产部署

- Linux
- Docker Engine
- Docker Compose v2，命令为 `docker compose`
- 默认运行资源限制：
  - Web：512 MB
  - PostgreSQL：256 MB

Next.js 构建需要明显高于运行阶段的内存。低资源部署机应使用[完整离线镜像部署](#完整离线镜像部署部署机不-build)。

## 本地开发

### 1. 启动 PostgreSQL

```bash
DB_USER='<自定义本地数据库用户>'
DB_PASSWORD="$(openssl rand -hex 32)"
DB_NAME='<自定义本地数据库名>'

docker run -d \
  --name crdocs-pg \
  -e POSTGRES_USER="$DB_USER" \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -e POSTGRES_DB="$DB_NAME" \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. 配置环境变量

```bash
cp .env.example .env
openssl rand -hex 32
```

编辑 `.env`，至少确认：

```dotenv
DATABASE_URL=postgres://<与上一步一致的用户>:<与上一步一致的密码>@localhost:5432/<与上一步一致的数据库名>
PAYLOAD_SECRET=替换成上一步生成的随机值
ADMIN_ORIGINS=http://localhost:3000
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=请设置强密码
```

### 3. 安装、迁移和初始化

```bash
pnpm install --frozen-lockfile
pnpm payload migrate
pnpm tsx scripts/seed.ts
```

`seed.ts` 是幂等的，会在缺少管理员时创建管理员，并写入三篇示例文档和侧边栏导航。

### 4. 启动开发服务器

```bash
pnpm dev
```

- 文档前台：<http://localhost:3000/docs/zh>
- 管理后台：<http://localhost:3000/admin>

首次登录后请立即修改管理员密码。

## 内容模型

### 文档

| 字段 | 说明 |
| --- | --- |
| `title` | 页面标题，中英文独立 |
| `slug` | URL 路径，不包含语言前缀，例如 `guide/install` |
| `excerpt` | 搜索结果和 SEO 摘要，中英文独立 |
| `content` | Markdown 正文，中英文独立 |
| `_status` | `draft` 或 `published` |

Payload 的 `_status` 属于整条文档，而不是每种语言分别拥有状态。给一篇已发布文档导入某语言的草稿，会让整篇文档进入草稿状态，避免尚未审核的翻译直接公开。

### 侧边栏

“侧边栏导航”可以手工编排分组和顺序。未加入手工导航的已发布文档不会丢失，前台会按照 slug 目录自动补入导航。

### 媒体

上传文件保存在宿主机 `./media`，数据库保存媒体记录。内容完全相同的图片通过 SHA-256 唯一索引复用。

## 常用命令

```bash
pnpm dev                         # 开发服务器
pnpm build                       # 生产构建
pnpm start                       # 启动生产构建
pnpm lint                        # ESLint
pnpm test:int                    # Vitest 逻辑和接口测试
pnpm test:e2e                    # Playwright；需准备站点和数据库
pnpm test:qa                     # 推荐：完整隔离 QA
pnpm generate:types              # 重新生成 Payload TypeScript 类型
pnpm generate:importmap          # 重新生成后台 import map
pnpm payload migrate             # 执行数据库迁移
pnpm payload migrate:create 名称 # 创建迁移
```

## 完整 QA

推荐在提交或交付前运行：

```bash
pnpm test:qa
```

脚本会自动：

1. 创建隔离 PostgreSQL 容器；
2. 执行全部 migrations；
3. 写入种子数据；
4. 执行 TypeScript 和 ESLint；
5. 执行全部 Vitest 和真实 Payload API 测试；
6. 启动测试站点；
7. 串行执行 Chromium E2E；
8. 停止开发服务器；
9. 执行 production build；
10. 删除测试容器和进程。

测试不会连接或修改开发、测试以外的数据库。涉及发布、删除和空站的破坏性 E2E 只允许在隔离 QA 环境运行。

当前覆盖包括：后台登录和语言切换、导入鉴权、单文件和文件夹导入、默认草稿、显式发布、图片和异常边界、中英文缺失处理、搜索、导航、取消发布、删除和空站。

## Docker 部署

### 从源码构建

适合资源充足的构建机：

```bash
cp .env.example .env
# 编辑 .env，至少填写 POSTGRES_USER、POSTGRES_PASSWORD、POSTGRES_DB、PAYLOAD_SECRET

./deploy.sh --no-seed
```

常用方式：

```bash
./deploy.sh                  # 构建并启动，写入示例数据
./deploy.sh --no-seed        # 构建并启动空站
./deploy.sh --rebuild        # 无缓存重新构建
WEB_PORT=80 ./deploy.sh      # 指定端口
```

Web 容器启动时会先执行 `payload migrate`，成功后再运行 `next start`。

## 镜像说明

完整离线归档文件：

```text
zenmux-docs-full-with-database.tar.gz
zenmux-docs-full-with-database.tar.gz.sha256
```

归档内包含两个 `linux/amd64` 镜像：

| 镜像 | 内容 |
| --- | --- |
| `zenmux-docs-web:latest` | Web 应用、Payload 后台、迁移脚本及 86 个媒体文件 |
| `postgres:16-alpine` | PostgreSQL 16 运行环境及首次启动导入的业务数据 SQL |

业务数据基线：

- 正文文档：120 篇；
- 媒体记录及文件：86 个；
- 包含导航、站点设置和迁移记录；
- 已排除 `audit/` 非正文目录及其历史版本；
- 不包含后台管理员、用户会话、用户偏好或用户锁定数据。

数据库镜像不内置默认账号、密码或数据库名。随镜像提供的 SQL 也不创建数据库角色、后台管理员或密码。Web 和 PostgreSQL 镜像均内置 Docker Healthcheck。

如只需升级已有站点的 Web 应用，可运行 `./save-image.sh` 导出单独的 Web 镜像；单 Web 镜像不包含 PostgreSQL 或业务数据。

## 镜像部署说明

### 1. 加载镜像

```bash
sha256sum -c zenmux-docs-full-with-database.tar.gz.sha256
docker load < zenmux-docs-full-with-database.tar.gz
```

### 2. 设置运行参数

```bash
cp .env.example .env
openssl rand -hex 32
```

编辑 `.env`，必须填写真实值：

```dotenv
POSTGRES_USER=<数据库用户>
POSTGRES_PASSWORD=<数据库强随机密码>
POSTGRES_DB=<数据库名>
PAYLOAD_SECRET=<随机长字符串>
ADMIN_ORIGINS=http://<实际访问地址>:<WEB_PORT>
```

数据库凭据没有默认值。空数据库卷首次启动时，PostgreSQL 官方入口先使用上述三个 `POSTGRES_*` 变量创建数据库账号和数据库，再执行 `/docker-entrypoint-initdb.d/10-zenmux-data.sql` 导入业务数据。已有 `cr-docs_pgdata` 卷时不会再次导入，卷内数据优先。

### 3. 启动

```bash
./deploy.sh --image --no-seed
```

必须使用 `--no-seed`：完整镜像已有正文数据，而 seed 会创建默认管理员和示例文档，不符合首次现场设置账号的要求。`--image` 不触发源码构建。

### 4. 首次设置后台管理员

打开：

```text
http://<服务器>:<WEB_PORT>/admin
```

页面应显示“创建第一个用户”。由部署者现场设置后台管理员邮箱和密码。`POSTGRES_USER` 是数据库账号，与后台管理员账号完全无关。

### 5. 上线验证

```bash
docker compose ps
# db 和 web 均应显示 healthy

curl -fsS http://127.0.0.1:${WEB_PORT:-3000}/admin >/dev/null
curl -fsS http://127.0.0.1:${WEB_PORT:-3000}/search-index >/dev/null
```

访问地址：

- 中文文档：`http://<服务器>:<WEB_PORT>/docs/zh`
- 英文文档：`http://<服务器>:<WEB_PORT>/docs/en`
- 管理后台：`http://<服务器>:<WEB_PORT>/admin`

不要仅用 `docker compose restart` 切换同标签的新镜像，应重新加载镜像后执行：

```bash
docker compose up -d --force-recreate
```

## 升级与数据库迁移

升级前备份数据库和媒体：

```bash
docker compose exec -T db \
  pg_dump -U payload -d crdocs --clean --if-exists \
  | gzip > cr-docs-$(date +%Y%m%d-%H%M).sql.gz

tar czf cr-docs-media-$(date +%Y%m%d-%H%M).tgz media
```

加载新镜像后：

```bash
docker load < cr-docs-image.tar.gz
./deploy.sh --image --no-seed
docker compose logs -f web
```

应用入口会在每次启动时执行尚未应用的 migration。

### 从含旧门户数据的版本升级

当前版本只保留文档站。升级 migration 会永久删除历史遗留的门户首页、门户导航和门户页脚数据表，不影响文档、媒体、用户、侧边栏导航和站点设置。

如果旧环境曾使用这些门户数据，升级前必须先完成数据库备份。该删除操作不可通过应用 migration 自动恢复。

## 数据持久化与迁移机器

必须备份两部分：

1. PostgreSQL：文档、用户、导航、配置和媒体元数据；
2. `./media`：实际上传文件。

迁移到新机器：

```bash
# 目标机先启动数据库
docker compose up -d db

# 恢复数据库
gunzip -c cr-docs.sql.gz \
  | docker compose exec -T db psql -U payload -d crdocs

# 恢复媒体
tar xzf cr-docs-media.tgz

# 加载并启动预构建镜像
docker load < cr-docs-image.tar.gz
./deploy.sh --image --no-seed
```

## 环境变量

| 变量 | 用途 | 示例 / 默认值 |
| --- | --- | --- |
| `DATABASE_URL` | 本地开发或外部 PostgreSQL 连接 | 必须使用实际数据库凭据 |
| `PAYLOAD_SECRET` | Payload 会话和加密密钥，生产必须随机 | 无安全默认值 |
| `ADMIN_ORIGINS` | 允许登录后台的浏览器源，逗号分隔 | `http://localhost:8300` |
| `WEB_PORT` | Compose 对外端口 | `3000` |
| `WEB_IMAGE` | Compose 使用的 Web 镜像 | `zenmux-docs-web:latest` |
| `POSTGRES_USER` | Compose 首次初始化时创建的 PostgreSQL 用户 | 必填，无默认值 |
| `POSTGRES_PASSWORD` | PostgreSQL 用户密码 | 必填，无默认值，必须使用强随机密码 |
| `POSTGRES_DB` | Compose 首次初始化时创建并导入数据的数据库 | 必填，无默认值 |
| `SEED_ADMIN_EMAIL` | seed 创建的管理员邮箱 | `admin@example.com` |
| `SEED_ADMIN_PASSWORD` | seed 创建的管理员密码 | `changeme123`，生产必须修改 |

修改访问域名、IP 或端口时，应同步更新 `ADMIN_ORIGINS`。遗漏正确来源可能表现为登录接口成功后又跳回登录页。

## 运维

```bash
docker compose ps
docker compose logs -f web
docker compose logs -f db
docker compose restart web
docker compose down              # 停止，保留数据库卷
docker compose down -v           # 删除数据库卷，危险
```

健康检查：

```bash
curl -I http://127.0.0.1:${WEB_PORT:-3000}/admin
curl -I http://127.0.0.1:${WEB_PORT:-3000}/docs/zh
```

## 常见问题

### 登录成功后又返回登录页

检查浏览器实际访问的 origin 是否包含在 `.env` 的 `ADMIN_ORIGINS` 中，包括协议、域名或 IP、端口。

### 导入后文档没有出现在前台

导入默认是草稿。请在后台检查内容和图片后发布，或在导入前明确选择“已发布”。

### 英文按钮不可点击

当前文档没有真实英文标题或正文。切换到后台 English 内容语言并补齐英文内容后，按钮会自动恢复。

### 全新部署显示空站

这是正常状态。进入后台创建并发布文档，或执行：

```bash
docker compose exec -T web node_modules/.bin/tsx scripts/seed.ts
```

### 图片在迁移后丢失

数据库只保存媒体记录，实际文件位于 `./media`。迁移数据库时必须同时复制媒体目录。

### 部署机内存不足，构建失败

不要在部署机 build。请在资源充足的构建机运行 `docker compose build web` 和 `./save-image.sh`，部署机只执行 `docker load` 与 `./deploy.sh --image --no-seed`。

### 查看 migration 失败原因

```bash
docker compose logs web
docker compose run --rm web node_modules/.bin/payload migrate:status
```

## 安全提示

- 生产环境必须修改 `PAYLOAD_SECRET`、数据库密码和初始管理员密码。
- 不要提交 `.env`、数据库备份、媒体目录或导出的镜像。
- 管理后台建议放在 HTTPS 反向代理之后。
- 定期同时备份 PostgreSQL 和 `./media`。

## License

MIT
