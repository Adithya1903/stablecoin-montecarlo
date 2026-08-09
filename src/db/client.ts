import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import path from 'node:path';

/**
 * The only file that knows we are on SQLite. Swapping to Postgres means
 * replacing this module (and the drizzle dialect import in schema.ts) —
 * queries.ts and everything above it are dialect-agnostic drizzle.
 */
export const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), 'data', 'app.db');

let _db: BetterSQLite3Database | null = null;

export function getDb(): BetterSQLite3Database {
  if (!_db) {
    const sqlite = new Database(DB_PATH, { readonly: false });
    sqlite.pragma('journal_mode = WAL');
    _db = drizzle(sqlite);
  }
  return _db;
}

/** For tests: an isolated in-memory database. */
export function createMemoryDb(): BetterSQLite3Database {
  return drizzle(new Database(':memory:'));
}
