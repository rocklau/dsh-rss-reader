import type { Context } from '@deepseek-ai/cordis'
import { PLUGIN_NAME } from './constants.ts'
import { Config, type Config as ConfigType } from './config.ts'
import { registerCommands } from './commands/index.ts'
import { registerBookTools } from './tools/bookTools.ts'
import { registerRssTools } from './tools/rssTools.ts'
import { ActivityService } from './services/activityService.ts'
import { ArticleService } from './services/articleService.ts'
import { FeedService } from './services/feedService.ts'
import { RssApi } from './services/rssApi.ts'
import { RssStore } from './services/rssStore.ts'
import { SyncService } from './services/syncService.ts'
import { RSS_API_CONTRIBUTION } from './typert-contribution.ts'

export const name = PLUGIN_NAME
export { Config }
export const inject = ['commands', 'tools', 'typert']

/**
 * OpenBook RSS Reader plugin entry. Constructs the service graph, registers
 * tools and chat commands, and triggers the optional startup sync.
 * @param ctx - plugin context (injects 'commands', 'tools', and 'typert').
 * @param config - validated plugin configuration.
 */
export function apply(ctx: Context, config: ConfigType): void {
  // Host invocation descriptors enable strict decoding at the Gateway.
  ctx.typert.register(RSS_API_CONTRIBUTION)

  // Service construction order follows the inject graph; each Service
  // registers itself on ctx by its key.
  new RssStore(ctx, config)
  new FeedService(ctx, config)
  new ArticleService(ctx, config)
  new ActivityService(ctx)
  new SyncService(ctx)
  new RssApi(ctx)

  registerRssTools(ctx)
  registerBookTools(ctx)
  registerCommands(ctx)

  if (config.startupSync) {
    // Defer so the process can finish loading other plugins first.
    ctx.effect(() => {
      const timer = setImmediate(() => {
        void ctx.rssSync.warmSync({
          limit: config.startupSyncLimit,
          reason: 'startup',
        }).catch(error => {
          console.error('[openbook-rss] startup sync failed:', error)
        })
      })
      return () => clearImmediate(timer)
    }, 'openbook-rss:startup-sync')
  }
}
