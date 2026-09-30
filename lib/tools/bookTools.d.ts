import type { Context } from '@deepseek-ai/cordis';
/**
 * Register the agent-readable "book" tools: JSON-shaped knowledge-base
 * queries for agents (the OpenBook CLI's `book * --json` surface).
 * @param ctx - plugin context with the OpenBook services injected.
 */
export declare function registerBookTools(ctx: Context): void;
