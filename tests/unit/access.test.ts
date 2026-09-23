import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getAccessRole,
  listMaintainers,
  removeMaintainer,
  saveMaintainer,
  syncIdentity
} from '../../src/lib/server/access';
import { resetConfigForTests } from '../../src/lib/server/config';
import { closeDatabaseForTests, getDatabase } from '../../src/lib/server/database';

let directory = '';

afterEach(() => {
  closeDatabaseForTests();
  resetConfigForTests();
  vi.unstubAllEnvs();
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
  directory = '';
});

function setup(): void {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'trunk-access-'));
  vi.stubEnv('NODE_ENV', 'test');
  vi.stubEnv('DATABASE_PATH', path.join(directory, 'test.db'));
  vi.stubEnv('BOOTSTRAP_MAINTAINER_OIDS', 'bootstrap-id');
}

describe('TRUNK access roles', () => {
  it('bootstraps only configured identities as maintainers', () => {
    setup();
    const base = { subject: 'subject', tenantId: 'tenant', displayName: 'Person' };
    expect(syncIdentity({ ...base, objectId: 'ordinary-id' })).toBe('User');
    expect(syncIdentity({ ...base, objectId: 'bootstrap-id' })).toBe('Maintainer');
    expect(getAccessRole('bootstrap-id')).toBe('Maintainer');
    expect(
      getDatabase().prepare("SELECT name FROM sqlite_master WHERE name='access_users'").get()
    ).toBeUndefined();
    expect(listMaintainers()).toEqual([{ objectId: 'bootstrap-id', displayName: 'Person' }]);
  });

  it('stores only Maintainers and protects the last maintainer', () => {
    setup();
    saveMaintainer({ objectId: 'first', displayName: 'First Maintainer' }, 'bootstrap');
    saveMaintainer({ objectId: 'second', displayName: 'Second Maintainer' }, 'first');
    expect(listMaintainers()).toHaveLength(2);
    removeMaintainer('second');
    expect(getAccessRole('second')).toBe('User');
    expect(() => removeMaintainer('first')).toThrow(/At least one maintainer/);
  });
});
