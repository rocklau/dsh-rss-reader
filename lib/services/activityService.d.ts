import { Service, type Context } from '@deepseek-ai/cordis';
import type { ActivityType } from '../constants.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Activity timeline and weekly review export. */
        rssActivity: ActivityService;
    }
}
/** One activity timeline item with its joined article. */
export interface ActivityItem {
    id: number;
    type: ActivityType;
    articleId: string | null;
    createdAt: string;
    payload: Record<string, unknown>;
    article: {
        id: string;
        title: string | null;
        link: string | null;
        feedUrl: string | null;
        markdownPath: string | null;
    } | null;
}
/**
 * Owns the append-only activity feed and the markdown review export.
 */
export declare class ActivityService extends Service {
    static inject: string[];
    constructor(ctx: Context);
    private get store();
    /** Latest activity items with pagination. */
    listActivity(options?: {
        limit?: number;
        offset?: number;
    }): {
        limit: number;
        offset: number;
        items: ActivityItem[];
    };
    /** Append one activity row. */
    logActivity(type: ActivityType, articleId: string | null, payload: Record<string, unknown>): void;
    /** Build a markdown weekly-review document covering the last `days`. */
    exportMarkdown(days: number): string;
}
