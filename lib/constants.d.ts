/** Shared constants for the OpenBook RSS Reader plugin. */
export declare const PLUGIN_NAME = "openbook-rss";
export declare const USER_AGENT = "OpenBook RSS Reader (+https://github.com/rocklau/OpenBook)";
/** Activity feed kinds (durable rows in activity_log). */
export declare const ACTIVITY_TYPES: {
    readonly STATE: "state";
    readonly NOTE: "note";
    readonly MATERIALIZE: "materialize";
};
export type ActivityType = (typeof ACTIVITY_TYPES)[keyof typeof ACTIVITY_TYPES];
/** Default feeds used when no OPML files are present. */
export declare const DEFAULT_FEEDS: readonly {
    url: string;
    name: string;
}[];
/** JSON index format version (data/index.json). */
export declare const JSON_INDEX_VERSION = 1;
