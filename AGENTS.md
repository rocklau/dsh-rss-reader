# OpenBook RSS Reader — dsh plugin

**Updated:** 2026-08-20
**Stack:** TypeScript (strict, ESM), Cordis plugin runtime, React 18 (client), node:sqlite

## Overview

OpenBook is a local-first RSS reader + knowledge collector rebuilt as a
DeepSeek Harness plugin. The host side is a Cordis plugin
(`@openbook/dsh-rss-reader`) exposing services, tools, chat commands, and a
Typert Remote API; the browser side is a client plugin contributing a
`conversation.view` reading page and an `rss/sync` conversation node.

## Structure

```text
./
├── package.json           # @openbook/dsh-rss-reader (dsh.bundle + dsh.client)
├── build.mjs              # esbuild host/client bundles + tsc declarations
├── cordis.patch.yml       # dsh web --patch overlay
├── src/                   # host side (Node)
│   ├── index.ts           # plugin entry: name/inject/Config/apply
│   ├── config.ts          # Schemastery Config schema
│   ├── constants.ts       # activity types, user agent, default feeds
│   ├── events/            # SessionEventMap declarations (rss/sync-*)
│   ├── db/                # node:sqlite schema, database, repositories
│   ├── rss/               # reader, fetch queue, SSRF guard, OPML
│   ├── markdown/          # html→md, image collector
│   ├── services/          # RssStore/Feed/Article/Activity/Sync/RssApi
│   ├── tools/             # rss_* and book_* model tools
│   └── commands/          # /feeds /book /notes ... chat commands
├── client/                # browser side (React)
│   ├── index.ts           # client apply: remote mount, RSS tab, go-to-RSS footer action, node slots
│   ├── remote.ts          # TypertRemoteContribution + typings (hand-written)
│   ├── api.ts             # view-facing data API over ctx.remote.rssApi
│   ├── switchToChat.ts    # switch the session view ring back to the Chat tab
│   ├── switchToRss.ts     # switch to the RSS tab (sidebar go-to-RSS shortcut, retried)
│   ├── views/             # RssContent (shared), RssView (tab), RssGoButton, Reader/Notes/Status
│   └── nodes/             # rss/sync conversation node + renderer
├── test/                  # node --test suites (build outputs in lib/)
└── legacy/                # the pre-refactor Express codebase (archived)
```

## Conventions

- ESM everywhere; relative imports use explicit `.ts` specifiers
  (`allowImportingTsExtensions`), esbuild rewrites them at bundle time.
- Services are Cordis `Service` subclasses registered on `ctx` by key
  (`rssStore`, `rssFeed`, `rssArticle`, `rssActivity`, `rssSync`, `rssApi`);
  consumers declare `static inject` and read `ctx.<key>`.
- The plugin entry exports `name` / `inject` / `Config` / `apply` (no
  default export) — the Loader discards the namespace otherwise.
- Registrations are effects: tools, commands, slots, and remote mounts are
  registered inside `apply`; the fiber unload removes them.
- Client↔host data flows only through the Typert Remote API; the wire
  contract lives in `client/remote.ts` (descriptors + zod schemas) and must
  stay in sync with `src/services/rssApi.ts` (@Remote methods).
- Session events emitted by tools/services
  (`openbook-rss/sync-start|progress|end`, `article-materialized`) are the
  durable log the client conversation node assembles from; event payload
  types live in `src/events/rssEvents.ts` and are mirrored in
  `client/events.ts`.
- SQL lives only in `src/db/repositories.ts`; migrations only in
  `src/db/schema.ts` (append-only, never edit shipped migrations).

## Commands

```bash
npm run build        # bundles + declarations
npm run typecheck    # tsc host + client
npm test             # build + node --test test/*.test.mjs
dsh web --patch ./cordis.patch.yml   # local boot with the plugin
```

## Where To Change Things

- Add a Remote method: `src/services/rssApi.ts` + `client/remote.ts` +
  `client/types.ts` (three places, one contract).
- Add a tool: `src/tools/rssTools.ts` (defineTool).
- Add a chat command: `src/commands/index.ts`.
- Add a UI surface: register slots in `client/index.ts`, views in
  `client/views/`.
- Change the DB: `src/db/schema.ts` (append a migration) +
  `src/db/repositories.ts`.

## Observability

- `OPENBOOK_WEB_VERBOSE` / `OPENBOOK_SYNC_VERBOSE` no longer apply; sync runs
  log via console and the `rss/sync` conversation node.
- `ctx.rssSync.getSyncStatus()` and the `/doctor` command cover health
  checks; the Status tab shows sync statistics and the activity stream.

## Notes

- The npm-published dsh closure is incomplete for full web boot in some
  environments (e.g. `@deepseek-ai/dsh-bash` is unpublished); for a full
  `dsh web` verification, run dsh from a source checkout of
  deepseek-harness (rc.8) and install this plugin into its profile.
- `node:sqlite` is experimental on Node 22; supported by dsh's engine range.
