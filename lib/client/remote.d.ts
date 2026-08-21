import type { RemoteResult, TypertClientRemote, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol';
import type { ActivityItem, ArticleView, FeedInfo, MaterializeResult, StateUpdateResult, SyncResult, SyncStatus } from './types.ts';
export declare const TYPERT_REMOTE: TypertRemoteContribution;
export default TYPERT_REMOTE;
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface TypertRemoteNamespace$727373417069 {
        listFeeds: () => Promise<RemoteResult<FeedInfo[]>>;
        addFeed: (url: string, name?: string) => Promise<RemoteResult<{
            ok: boolean;
            reason?: string;
        }>>;
        listArticles: (limit?: number) => Promise<RemoteResult<ArticleView[]>>;
        listArticlesByDate: (date: string) => Promise<RemoteResult<ArticleView[]>>;
        listArticlesByFeed: (feedUrl: string, limit?: number) => Promise<RemoteResult<ArticleView[]>>;
        searchArticles: (query: string, limit?: number) => Promise<RemoteResult<ArticleView[]>>;
        getArticle: (articleId: string) => Promise<RemoteResult<ArticleView | null>>;
        materialize: (request: {
            url: string;
            feedUrl?: string;
            title?: string;
            publishedAt?: string;
        }) => Promise<RemoteResult<MaterializeResult>>;
        updateState: (request: {
            articleId: string;
            isRead?: boolean;
            isFavorite?: boolean;
        }) => Promise<RemoteResult<StateUpdateResult>>;
        createNote: (request: {
            articleId: string;
            title?: string;
            content?: string;
        }) => Promise<RemoteResult<{
            ok: boolean;
            articleId: string;
            notePath: string;
        }>>;
        listNotes: (articleId: string) => Promise<RemoteResult<{
            articleId: string;
            notes: Array<{
                id: number;
                notePath: string;
                createdAt: string;
            }>;
        }>>;
        activity: (limit?: number, offset?: number) => Promise<RemoteResult<{
            limit: number;
            offset: number;
            items: ActivityItem[];
        }>>;
        exportReview: (days?: number) => Promise<RemoteResult<string>>;
        syncStatus: () => Promise<RemoteResult<SyncStatus>>;
        warmSync: (limit?: number, timeoutMs?: number, reason?: string, sessionId?: string) => Promise<RemoteResult<SyncResult>>;
        orphanArticles: () => Promise<RemoteResult<ArticleView[]>>;
        setReading: (request: {
            sessionId: string;
            articleId: string;
        }) => Promise<RemoteResult<{
            ok: boolean;
            reason?: string;
        }>>;
        discussArticle: (request: {
            sessionId: string;
            articleId: string;
            prompt?: string;
            highlight?: string;
        }) => Promise<RemoteResult<{
            ok: boolean;
            reason?: string;
        }>>;
    }
    interface TypertRemoteMap {
        'rssApi/listFeeds': TypertRemoteNamespace$727373417069['listFeeds'];
        'rssApi/addFeed': TypertRemoteNamespace$727373417069['addFeed'];
        'rssApi/listArticles': TypertRemoteNamespace$727373417069['listArticles'];
        'rssApi/listArticlesByDate': TypertRemoteNamespace$727373417069['listArticlesByDate'];
        'rssApi/listArticlesByFeed': TypertRemoteNamespace$727373417069['listArticlesByFeed'];
        'rssApi/searchArticles': TypertRemoteNamespace$727373417069['searchArticles'];
        'rssApi/getArticle': TypertRemoteNamespace$727373417069['getArticle'];
        'rssApi/materialize': TypertRemoteNamespace$727373417069['materialize'];
        'rssApi/updateState': TypertRemoteNamespace$727373417069['updateState'];
        'rssApi/createNote': TypertRemoteNamespace$727373417069['createNote'];
        'rssApi/listNotes': TypertRemoteNamespace$727373417069['listNotes'];
        'rssApi/activity': TypertRemoteNamespace$727373417069['activity'];
        'rssApi/exportReview': TypertRemoteNamespace$727373417069['exportReview'];
        'rssApi/syncStatus': TypertRemoteNamespace$727373417069['syncStatus'];
        'rssApi/warmSync': TypertRemoteNamespace$727373417069['warmSync'];
        'rssApi/orphanArticles': TypertRemoteNamespace$727373417069['orphanArticles'];
        'rssApi/setReading': TypertRemoteNamespace$727373417069['setReading'];
        'rssApi/discussArticle': TypertRemoteNamespace$727373417069['discussArticle'];
    }
    interface TypertRemoteNamespaceMap {
        rssApi: TypertRemoteNamespace$727373417069;
    }
}
declare module '@deepseek-ai/cordis' {
    interface Context {
        /** Client Remote API gateway (provided by the web shell). */
        remote: TypertClientRemote;
    }
}
