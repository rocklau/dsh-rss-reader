import { DatabaseSync } from 'node:sqlite';
/** Open (or create) the RSS database, apply migrations, and enable WAL. */
export declare function openRssDatabase(dbPath: string): DatabaseSync;
/**
 * Run a body inside one transaction; roll back on throw and rethrow.
 * @param db - the database handle.
 * @param body - transactional work.
 * @returns the body's return value.
 */
export declare function withTransaction<T>(db: DatabaseSync, body: () => T): T;
