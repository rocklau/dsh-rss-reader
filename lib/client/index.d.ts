/**
 * OpenBook RSS Reader browser plugin.
 *
 * Mounts the host Remote API, injects the reader styles, and registers three
 * surfaces:
 * 1. the RSS reading page as a `conversation.view` tab (the single RSS
 *    reader — one surface, no competing docked panel);
 * 2. a `sidebar.footer.action` "go to RSS" shortcut that jumps straight to
 *    that tab (opening a non-blank session first when needed);
 * 3. the rss/sync conversation node plus its chat renderer.
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const inject: string[];
/**
 * Required services: the client remote gateway, the slot/conversation
 * registries, and the session list service.
 *
 * The host `rssApi` namespace is mounted by `ctx.remote.$mount()`, which
 * registers it as the `remote.rssApi` service. Data-loading surfaces wait on
 * that service via `ctx.inject([...])`, then obtain the namespace through
 * `scope.get('remote.rssApi')` (which bypasses the inject-sensitive ctx
 * property proxy) and build the view data API from it.
 */
export declare function apply(ctx: Context): void;
