import type { ArticleView, FeedInfo } from '../types.ts';
export interface ReaderViewProps {
    api: {
        listFeeds: () => Promise<FeedInfo[]>;
        listArticlesRecent: (limit: number) => Promise<ArticleView[]>;
        listArticlesByDate: (date: string) => Promise<ArticleView[]>;
        listArticlesByFeed: (feedUrl: string) => Promise<ArticleView[]>;
        getArticle: (articleId: string) => Promise<ArticleView | null>;
        updateState: (request: {
            articleId: string;
            isRead?: boolean;
            isFavorite?: boolean;
        }) => Promise<unknown>;
        createNote: (request: {
            articleId: string;
            title?: string;
            content?: string;
        }) => Promise<unknown>;
        materialize: (request: {
            url: string;
            title?: string;
        }) => Promise<unknown>;
        listNotes: (articleId: string) => Promise<{
            notes: Array<{
                notePath: string;
                createdAt: string;
            }>;
        }>;
        warmSync: (limit?: number, timeoutMs?: number, reason?: string) => Promise<unknown>;
        setReading: (request: {
            sessionId: string;
            articleId: string;
        }) => Promise<{
            ok: boolean;
            reason?: string;
        }>;
        discussArticle: (request: {
            sessionId: string;
            articleId: string;
            prompt?: string;
            highlight?: string;
        }) => Promise<{
            ok: boolean;
            reason?: string;
        }>;
    };
    /** Current session id for chat integration; undefined when no session is open. */
    sessionId?: string;
    onSyncDone: () => void;
}
export declare function ReaderView({ api, sessionId, onSyncDone }: ReaderViewProps): import("react").JSX.Element;
