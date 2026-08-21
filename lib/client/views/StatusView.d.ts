import type { ActivityItem, SyncStatus } from '../types.ts';
export interface StatusViewProps {
    api: {
        syncStatus: () => Promise<SyncStatus>;
        activity: (limit: number) => Promise<{
            items: ActivityItem[];
        }>;
        listFeeds: () => Promise<Array<{
            url: string;
            name: string;
        }>>;
    };
}
export declare function StatusView({ api }: StatusViewProps): import("react").JSX.Element;
