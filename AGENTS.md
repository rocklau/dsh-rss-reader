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
- Current sync reports through the Remote status API without appending RSS
  telemetry to Session logs. The client renders already-loaded historical
  sync records; payload declarations live in `src/events/rssEvents.ts` and
  `client/events.ts`. Historical log repair requires a Harness-owned migration.
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
  report results through the Remote status API.
- `ctx.rssSync.getSyncStatus()` and the `/doctor` command cover health
  checks; the Status tab shows sync statistics and the activity stream.

## Notes

- The supported runtime is Harness 0.2.0-rc.2 with Cordis 4.0.4. Development dependencies link to the adjacent built Harness checkout; do not restore removed dsh-client-runtime packages.
- Cordis takes plugin config directly: `ctx.plugin(plugin, config)`, not `{ config }`. Tests use project-local data roots with startup sync disabled.
- Client Session APIs belong to `dsh-api-session-controller/client`; definitions register through `ctx.uiConversation.events`, selected Session bindings through `ctx.uiSession`, and navigation through `ctx.uiWorkspace`.
- Host invocation contributions use `ctx.typert.register()`; `ctx.typert.remotes.register()` supplies consumer-side Remote definitions, not Host strict decoders.
- `node:sqlite` is experimental on Node 22; supported by dsh's engine range.
