/**
 * OpenBook RSS Reader plugin build.
 *
 * Emits:
 * - lib/index.js       host bundle (Node ESM; third-party deps externalized)
 * - lib/invariant.js   host invariant stub
 * - lib/client.js      browser bundle in the dsh closure-factory format
 *                      (window.__ModuleLoader__.load({id, factory}))
 * - lib/types/*.d.ts   host declaration files (via tsc)
 * - lib/client/*.d.ts  browser declaration files (via tsc)
 */
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { rmSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

const CLIENT_EXTERNALS = [
  // shell-seeded platform modules
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  // preloaded dynamic rows
  '@deepseek-ai/dsh-client-runtime/client',
  // other plugin rows our client code reaches at runtime
  '@deepseek-ai/dsh-client-ui-conversation/client',
]

const HOST_EXTERNALS = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
]

rmSync(new URL('./lib', import.meta.url), { recursive: true, force: true })

const common = { bundle: true, logLevel: 'info', sourcemap: false, minify: false }

// --- host bundle: Node ESM, external deps stay external ---------------------
await build({
  ...common,
  entryPoints: ['src/index.ts', 'src/invariant.ts', 'src/internal.ts'],
  outdir: 'lib',
  format: 'esm',
  platform: 'node',
  target: 'node22',
  external: HOST_EXTERNALS,
  outExtension: { '.js': '.js' },
})

// --- client bundle: closure-factory classic script --------------------------
const clientEntry = 'client/index.ts'
const banner = `window.__ModuleLoader__.load({
\tid: ${JSON.stringify(pkg.name)},
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\t`
const footer = `
\t\treturn module.exports;
\t}
});
`

await build({
  ...common,
  entryPoints: [clientEntry],
  outfile: 'lib/client.js',
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  jsx: 'automatic',
  external: CLIENT_EXTERNALS,
  banner: { js: banner },
  footer: { js: footer },
})

// --- declarations -----------------------------------------------------------
execFileSync('npx', ['tsc', '-p', 'tsconfig.json'], { stdio: 'inherit' })
execFileSync('npx', ['tsc', '-p', 'tsconfig.client.json'], { stdio: 'inherit' })

console.log('[build] done: lib/index.js lib/invariant.js lib/client.js + declarations')
