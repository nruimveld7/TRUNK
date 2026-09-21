import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Preferences, SessionUser } from '$lib/types';
import { getConfig } from './config';

export const DEFAULT_PREFERENCES: Preferences = {
  appearance: 'system',
  launchBehavior: 'same',
  density: 'comfortable'
};

let database: DatabaseSync | undefined;

function migrate(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_json TEXT,
      csrf_token TEXT NOT NULL,
      auth_state TEXT,
      auth_nonce TEXT,
      auth_verifier TEXT,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS preferences (
      user_key TEXT PRIMARY KEY,
      appearance TEXT NOT NULL,
      launch_behavior TEXT NOT NULL,
      density TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS favorites (
      user_key TEXT NOT NULL,
      application_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      PRIMARY KEY(user_key, application_id)
    );
    CREATE INDEX IF NOT EXISTS favorites_order_idx ON favorites(user_key, position);
    CREATE TABLE IF NOT EXISTS recent (
      user_key TEXT NOT NULL,
      application_id TEXT NOT NULL,
      launched_at INTEGER NOT NULL,
      launch_count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY(user_key, application_id)
    );
    CREATE INDEX IF NOT EXISTS recent_order_idx ON recent(user_key, launched_at DESC);
    INSERT OR IGNORE INTO migrations(version) VALUES (1);
  `);
}

export function getDatabase(databasePath = getConfig().DATABASE_PATH): DatabaseSync {
  if (database) return database;
  const absolutePath = path.resolve(databasePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  database = new DatabaseSync(absolutePath);
  database.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  migrate(database);
  return database;
}

export function userKey(user: SessionUser): string {
  return `${user.tenantId}:${user.objectId}`;
}

export function getPreferences(key: string): Preferences {
  const row = getDatabase()
    .prepare('SELECT appearance, launch_behavior, density FROM preferences WHERE user_key = ?')
    .get(key) as
    | {
        appearance: Preferences['appearance'];
        launch_behavior: Preferences['launchBehavior'];
        density: Preferences['density'];
      }
    | undefined;
  return row
    ? { appearance: row.appearance, launchBehavior: row.launch_behavior, density: row.density }
    : { ...DEFAULT_PREFERENCES };
}

export function savePreferences(key: string, preferences: Preferences): void {
  getDatabase()
    .prepare(
      `INSERT INTO preferences(user_key, appearance, launch_behavior, density, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_key) DO UPDATE SET appearance=excluded.appearance,
      launch_behavior=excluded.launch_behavior, density=excluded.density, updated_at=CURRENT_TIMESTAMP`
    )
    .run(key, preferences.appearance, preferences.launchBehavior, preferences.density);
}

export function getFavorites(key: string): string[] {
  return (
    getDatabase()
      .prepare(
        'SELECT application_id FROM favorites WHERE user_key = ? ORDER BY position, application_id'
      )
      .all(key) as Array<{ application_id: string }>
  ).map((row) => row.application_id);
}

export function saveFavorites(key: string, ids: string[]): void {
  const db = getDatabase();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM favorites WHERE user_key = ?').run(key);
    const insert = db.prepare(
      'INSERT INTO favorites(user_key, application_id, position) VALUES (?, ?, ?)'
    );
    ids.forEach((id, position) => insert.run(key, id, position));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function recordRecent(key: string, id: string, now = Date.now()): void {
  getDatabase()
    .prepare(
      `INSERT INTO recent(user_key, application_id, launched_at, launch_count) VALUES (?, ?, ?, 1)
    ON CONFLICT(user_key, application_id) DO UPDATE SET launched_at=excluded.launched_at, launch_count=launch_count+1`
    )
    .run(key, id, now);
}

export function getRecent(key: string, limit = 30): string[] {
  return (
    getDatabase()
      .prepare(
        'SELECT application_id FROM recent WHERE user_key = ? ORDER BY launched_at DESC LIMIT ?'
      )
      .all(key, limit) as Array<{ application_id: string }>
  ).map((row) => row.application_id);
}

export function closeDatabaseForTests(): void {
  database?.close();
  database = undefined;
}
