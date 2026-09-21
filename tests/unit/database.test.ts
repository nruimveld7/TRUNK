import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  closeDatabaseForTests,
  getFavorites,
  getPreferences,
  getRecent,
  recordRecent,
  saveFavorites,
  savePreferences
} from '../../src/lib/server/database';

let directory = '';
afterEach(() => {
  closeDatabaseForTests();
  vi.unstubAllEnvs();
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
  directory = '';
});
function setup(): void {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'trunk-db-'));
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('DATABASE_PATH', path.join(directory, 'test.db'));
}

describe('SQLite persistence', () => {
  it('persists ordered favorites and preferences', () => {
    setup();
    saveFavorites('tenant:user', ['b', 'a']);
    savePreferences('tenant:user', {
      appearance: 'dark',
      launchBehavior: 'new',
      density: 'compact'
    });
    expect(getFavorites('tenant:user')).toEqual(['b', 'a']);
    expect(getPreferences('tenant:user')).toEqual({
      appearance: 'dark',
      launchBehavior: 'new',
      density: 'compact'
    });
  });

  it('keeps recent ordering independent from catalog ordering', () => {
    setup();
    recordRecent('tenant:user', 'a', 100);
    recordRecent('tenant:user', 'b', 200);
    recordRecent('tenant:user', 'a', 300);
    expect(getRecent('tenant:user')).toEqual(['a', 'b']);
  });
});
