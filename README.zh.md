# OpenBook RSS Reader — DeepSeek Harness UI 插件

[English](README.md)

OpenBook 是一个本地优先（local-first）的 RSS 阅读器 + 知识收集器，重构为
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）插件。
订阅同步、文章物化、笔记/高亮、活动时间线、聊天命令、三栏阅读界面——全部作为原生
Cordis 服务运行在 dsh 插件运行时里。

| | |
|---|---|
| 包名 | `@openbook/dsh-rss-reader` |
| 宿主运行时 | Node `^22.19 \|\| >=24`，Harness `0.2.0-rc.2`，Cordis `4.0.4`，Schemastery `3.18.4` |
| 许可 | MIT |

![](assets/go-to-rss.png)

*点一下侧栏 📡 快捷键直达 RSS 标签；讨论文章会把它推进对话并自动切回 Chat。*

## 功能

唯一的 RSS 界面：**会话视图环里的 `RSS` 标签**（一个 `conversation.view` 条目）。
三栏阅读器：订阅源侧栏、按日期的文章队列（可前后翻日）、全文阅读、收藏、笔记，
外加 **Notes**（活动驱动瀑布流）与 **Status**（同步统计、活动流）两个子标签。
侧栏 **📡 快捷键**一键跳到 RSS 标签（必要时先打开一个非空白会话）——一个阅读器、
一个清晰入口，没有与之竞争的停靠面板。

阅读与对话联动：

- **环境感知** — 打开文章即注入当前会话的 agent 上下文（`agent.inject`），模型无需
  一轮对话就知道你在读什么。
- **讨论这篇** — 快捷指令（总结 / 翻译 / 提取要点）+ 自由问题，把文章推进对话
  （`agent.followup`），随后自动切回 **Chat** 标签让你看到回复；先选中文字会把它
  作为高亮片段一并发送。
- **同步状态** — Status 标签显示实时同步结果。`rss/sync` 渲染器可展示已经加载的历史 RSS 事件；当前同步不会向 Session 日志追加自定义遥测事件。

![](assets/discuss-back-to-chat.png)

同样的能力也开放给 agent：

- **模型可调用的工具**：`rss_list_feeds`、`rss_sync`、`rss_search`、
  `rss_read_article`、`rss_materialize`、`rss_save_note`、`rss_export_review`，
  以及面向 agent 的 `book_index`、`book_recent`、`book_article`、`book_search`。
- **聊天命令**（原 `cli.js` 命令 1:1 映射）：`/feeds`、`/read`、`/search`、
  `/recent`、`/notes`、`/favorites`、`/stats`、`/open`、`/materialize`、`/sync`、
  `/export-review`、`/review`、`/activity`、`/book`、`/doctor`。

## 安装

### 构建本地 bundle

本工作副本面向当前本地 Harness，不面向旧版已发布 tarball。仓库目录分别为 `ai/deepseek-harness` 和 `ai/dsh-plugins/dsh-rss-reader`；开发依赖链接到已构建的 Harness 库。先按 Harness 自身的开发说明完成构建。

```sh
pnpm install --no-frozen-lockfile
pnpm typecheck
pnpm build
pnpm pack
```

tarball 包含宿主/客户端运行代码、类型声明和 `cordis.patch.yml`。精确 peer 版本要求 Harness `0.2.0-rc.2`、Cordis `4.0.4` 和 Schemastery `3.18.4`，不捆绑旧版 Harness。这些运行时 peer 在包管理器解析时标为可选，避免安装时自动加入第二套框架；实际运行仍由当前 Harness 提供。插件私有依赖仍作为普通依赖安装。浏览器入口为 `lib/client.js`；Session API 来自 `dsh-api-session-controller/client`，节点组装由 `ctx.uiConversation` 提供，Session 选择由 `ctx.uiSession`/`ctx.uiWorkspace` 提供。

Desktop 开发环境请打开运行中应用的**插件**页面，安装 `openbook-dsh-rss-reader-0.1.0-rc.2.tgz`，启用 bundle，并按提示重启 Desktop。打开非空白会话后选择 **RSS**，或使用侧栏 RSS 快捷入口。安装到 CLI Web profile 不等于安装到 Desktop 的保留 profile。阅读控件无需模型调用；文章上下文与讨论需要实时 Agent。

Host 解析器必须保留完整 npm 标识，例如 `jsdom` 经 `tr46` 请求的 `punycode/`。如果启用时出现 `createRequire.resolve.paths ... not iterable`，说明 Harness 解析器把 npm 请求当成了 Node 内置模块 `punycode`。启用 RSS 前请使用包含[解析器修复](https://github.com/rocklau/deepseek-harness/commit/966d0b19621619c57e8f9ed578e82ee6a1b8b9b2)的 Harness 检出；仅匹配包的 peer 版本不能确认该修复。修复已发布在 `rocklau/deepseek-harness` fork 的 `fix/preserve-npm-subpath-resolution` 分支，尚未合并到上游仓库。

### 测试

```sh
pnpm test              # build + node --test；项目内隔离测试目录
pnpm test:e2e          # 已安装宿主的只读检查；没有 DSH_E2E_BASE 时跳过
```

`test/current-harness.test.mjs` 使用当前真实 Gateway、工具/命令/Typert 注册表、带稳定标识的 Agent 消息和已构建浏览器 factory。可选 e2e 通过 `DSH_E2E_BASE` 连接已经运行的宿主，需要身份验证时使用 `DSH_E2E_COOKIE`；它不会启动或重启应用。

## 配置

所有选项在加载时校验，可通过 patch overlay 覆盖：

```yaml
# cordis.patch.yml
- id: openbook-rss
  config:
    dataDir: /absolute/existing/openbook-rss/v1 # 保留现有数据目录
    allowPrivateFeeds: false            # SSRF 防护：拦截 DNS 私网段
    startupSync: true                   # 启动时热同步
    startupSyncLimit: 50
    feedMinSyncIntervalMs: 120000
    feedHeadCheck: true                 # 条件 GET 前先 HEAD 校验
    feedHeadTimeoutMs: 3000
    fetchConcurrency: 4
    fetchIntervalCap: 10                # 每个速率窗口的请求数
    fetchIntervalMs: 1000
    defaultFeeds: [{ url: "...", name: "..." }]
    opmlFiles: []                       # 启动时导入的 OPML 绝对路径
```

默认 `dataDir` 是 Harness home paths 解析的 `$DSH_HOME/openbook-rss/v1`。覆盖时请使用绝对路径，插件不展开 `~`。保留原路径即可保留 SQLite、文章、笔记与索引。`src/db/schema.ts` 中的 SQLite schema 世代未修改。`defaultFeeds: []` 禁用初始默认订阅源填充，但不会删除已有订阅源。

阅读上下文与讨论需要已经运行的 Agent。没有实时 Session 时返回 `{ ok: false, reason: 'session not found' }`，没有文章时返回 `article not found`。RPC schema 在服务执行前拒绝无效输入。订阅源/文章抓取失败通过同步状态或操作错误报告；私网订阅源需要显式设置 `allowPrivateFeeds: true`。RSS 标签需要非空白 Session；侧栏快捷入口在有可用项时选择已有非空白 Session。

不要使用旧的 `scripts/heal-openbook-rss-logs.mjs` 改写 Session 文件。该命令拒绝执行且不修改文件，因为已提交的 Session 世代不可变。历史不可忽略 RSS 事件的修复需要 Harness 自身的迁移；本插件不修复或删除用户 Session 数据。

## 数据模型

插件在 `dataDir` 下保持三态本地持久化：

- `openbook.db` — SQLite（feeds、抓取缓存、同步状态/日志、文章、文章状态、笔记、
  活动日志），WAL 模式，迁移在 `src/db/schema.ts`。
- `articles/YYYY/MM/*.md` — 物化文章，带 YAML front matter
  （`title`、`url`、`feed_url`、`published_at`、`fetched_at`、`source`）。
- `notes/YYYY/MM/*.md` — 以 `article_id` 关联的笔记/高亮。
- `index.json` — 紧凑、便于 grep 的 feed/文章索引。

文章 id 为 `sha256(feedUrl::guid|link|title)`（`stableId`），跨同步幂等。物化按
归一化 URL 去重并以 in-flight 合并串行化；图片资源以 MD5 哈希去重本地化到
`<article>-assets/`（`downloadResources`）。

## 抓取管线

内存缓存 → 按源最小间隔跳过 → HEAD 校验（ETag / Last-Modified）→ 条件 GET（304）→
SQLite BLOB 兜底。所有请求走共享限流队列，429/5xx 指数退避重试；订阅源 URL 在 DNS
层做 SSRF 检查（除非 `allowPrivateFeeds: true`，否则拦截私网段）。

## 开发

```sh
pnpm typecheck          # 宿主 + 客户端两侧，使用链接的当前库
pnpm test               # build + node --test（回环网络 fixture，无需外部 API）
```

目录结构：

```
src/        宿主侧（Node）— 插件入口、Cordis 服务、工具、命令、db、rss 引擎
client/     浏览器侧（React）— 阅读视图、notes/status 标签、sync 会话节点
cordis.patch.yml   dsh web --patch 用的 bundle overlay
legacy/     重构前的 Express 代码库，已归档（不随本仓库发布）
```

宿主入口（`src/index.ts`）构造六个 Cordis 服务：`rssStore`（数据库 + 仓储 + 抓取队列）、
`rssFeed`（订阅源 + 阅读引擎）、`rssArticle`（查询/物化/状态/笔记）、`rssActivity`
（时间线 + 周报导出）、`rssSync`（热同步状态机）、`rssApi`（客户端调用的 Typert Remote
面）。客户端挂载对应的 `TypertRemoteContribution`（手写于 `client/remote.ts`），注册
`conversation.view` 标签与 `rss/sync` 会话节点及其渲染器。

## 从旧版 OpenBook 的映射

| 旧版 | 插件 |
|---|---|
| Express server + routes | Cordis 服务 + Typert Remote API |
| `public/` 三栏 UI | `conversation.view` 标签（React） |
| `cli.js` 命令 | 聊天斜杠命令（`/feeds`、`/book`、`/export-review`…） |
| `book * --json` | `book_*` 工具 + `/book` |
| RSSReader + 队列 + 缓存 | `RssReader` 服务（同样的分层缓存） |
| `data/` 布局 | 所配置 `dataDir` 下同样的布局；见[配置](#配置) |
