import type { ActivityItem } from '../types.ts';
export interface NotesViewProps {
    api: {
        activity: (limit: number) => Promise<{
            items: ActivityItem[];
        }>;
        listArticlesByFeed: (feedUrl: string) => Promise<unknown[]>;
    };
}
export declare function NotesView({ api }: NotesViewProps): import("react").JSX.Element;
