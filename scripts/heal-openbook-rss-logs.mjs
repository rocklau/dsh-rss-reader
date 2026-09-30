#!/usr/bin/env node
/** Refuse the legacy in-place repair: committed Harness Session generations are immutable. */
console.error('RSS log repair is unsupported on Harness 0.2.0-rc.2. Do not rewrite committed Session files; use Harness-owned adjacent Session migrations. This command makes no file changes.')
process.exitCode = 1
