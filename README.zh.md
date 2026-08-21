# OpenBook RSS Reader — DeepSeek Harness UI 插件

[English](README.md)

OpenBook 是一个本地优先（local-first）的 RSS 阅读器 + 知识收集器，重构为
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）插件。
订阅同步、文章物化、笔记/高亮、活动时间线、聊天命令、三栏阅读界面——全部作为原生
Cordis 服务运行在 dsh 插件运行时里。

| | |
|---|---|
| 包名 | `@openbook/dsh-rss-reader` |
| 宿主运行时 | Node `^22.19 \|\| >=24`，dsh `>=0.1.0-rc.8` |
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
- **同步节点** — 每次同步在对话流里渲染为一张紧凑卡片（`rss/sync` 会话节点），
  由持久化会话事件驱动。

![](assets/discuss-back-to-chat.png)

同样的能力也开放给 agent：

- **模型可调用的工具**：`rss_list_feeds`、`rss_sync`、`rss_search`、
  `rss_read_article`、`rss_materialize`、`rss_save_note`、`rss_export_review`，
  以及面向 agent 的 `book_index`、`book_recent`、`book_article`、`book_search`。
- **聊天命令**（原 `cli.js` 命令 1:1 映射）：`/feeds`、`/read`、`/search`、
  `/recent`、`/notes`、`/favorites`、`/stats`、`/open`、`/materialize`、`/sync`、
  `/export-review`、`/review`、`/activity`、`/book`、`/doctor`。

## 安装

### 作为 dsh bundle（推荐）

包内置预构建的客户端 bundle（`lib/`）并声明了 `dsh.bundle` + `dsh.client`，
可直接用插件 CLI 安装。从[最新 release](https://github.com/rocklau/dsh-rss-reader/releases)
下载 tarball 并添加（无需 npm 账号）：

```sh
dsh plugin add https://github.com/rocklau/dsh-rss-reader/releases/download/v0.1.0-rc.1/openbook-dsh-rss-reader-0.1.0-rc.1.tgz
```

这会向 profile 的组合注入 `openbook-rss` 行；浏览器插件由 `lib/client.js` 提供。
本地检出同理：`dsh plugin add ./dsh-rss-reader`。

```sh
# 从 npm（发布后）
dsh plugin --profile web add @openbook/dsh-rss-reader

# 然后启动 Web UI
dsh web
```

`dsh plugin add` 把包安装进 `web` profile；因为包声明了 `dsh.bundle`，会自动加入该
profile 的 bundle 列表，无需其他配置。

### 开发（免安装）

```sh
npm install
npm run build          # esbuild 打包 + tsc 声明
dsh web --patch ./cordis.patch.yml
```

`cordis.patch.yml` 里的 overlay 把插件插入运行中的 web profile；客户端半边（`RSS`
视图标签）由包的 `dsh.client` 声明自动接入。

### 测试

```sh
npm test               # 单元测试（node --test）
npm run test:e2e       # 真实组合 e2e；需要 DSH_SOURCE_DIR
```

e2e 会启动一个真实的 `dsh web` 组合，并用与浏览器相同的传输调用 `rssApi` 端点：

```sh
DSH_SOURCE_DIR=/path/to/deepseek-harness npm run test:e2e
```

## 配置

所有选项在加载时校验，可通过 patch overlay 覆盖：

```yaml
# cordis.patch.yml
- id: openbook-rss
  config:
    dataDir: ~/.dsh/openbook-rss/v1     # sqlite + markdown + notes + index.json
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
npm run typecheck       # 宿主 + 客户端两侧
npm test                # build + node --test（无需网络）
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
| `data/` 布局 | `dataDir` 下同样的布局（默认 `~/.dsh/openbook-rss/v1`） |
