import type { Context } from '@deepseek-ai/cordis';
/**
 * Register the OpenBook chat commands (the dsh-native replacement of the
 * legacy `cli.js` surface). Every legacy CLI command has a mapping:
 *
 *   list / read <i> / search <q> / recent [n]      -> /feeds, /read, /search, /recent
 *   notes / highlights / favorites / activity [n]  -> /notes, /favorites, /activity
 *   open <i> / materialize <i> / sync [n] [ms]     -> /open, /materialize, /sync
 *   export [days] / review [days] / stats          -> /export-review, /review, /stats
 *   doctor / book *                                -> /doctor, /book <index|recent|article|search>
 *
 * @param ctx - plugin context with the OpenBook services injected.
 */
export declare function registerCommands(ctx: Context): void;
