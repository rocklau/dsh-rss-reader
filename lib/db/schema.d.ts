import type { DatabaseSync } from 'node:sqlite';
/** Apply all pending migrations and guarded indexes. */
export declare function migrate(db: DatabaseSync): void;
