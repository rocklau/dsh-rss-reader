import type { Context } from '@deepseek-ai/cordis';
/**
 * Register the OpenBook RSS model-facing tools. Tools are effects: they are
 * unregistered automatically when the plugin fiber unloads.
 * @param ctx - plugin context with the OpenBook services injected.
 */
export declare function registerRssTools(ctx: Context): void;
