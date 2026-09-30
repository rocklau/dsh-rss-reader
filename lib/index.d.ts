import type { Context } from '@deepseek-ai/cordis';
import { Config, type Config as ConfigType } from './config.ts';
export declare const name = "openbook-rss";
export { Config };
export declare const inject: string[];
/**
 * OpenBook RSS Reader plugin entry. Constructs the service graph, registers
 * tools and chat commands, and triggers the optional startup sync.
 * @param ctx - plugin context (injects 'commands', 'tools', and 'typert').
 * @param config - validated plugin configuration.
 */
export declare function apply(ctx: Context, config: ConfigType): void;
