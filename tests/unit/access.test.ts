import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  getAccessRole,
  listManagedUsers,
  removeManagedUser,
  saveManagedUser,
  syncIdentity
} from '../../src/lib/server/access';
import { resetConfigForTests } from '../../src/lib/server/config';
import { closeDatabaseForTests } from '../../src/lib/server/database';

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
    expect(syncIdentity({ ...base, objectId: 'ordinary-id' })).toBeNull();
    expect(syncIdentity({ ...base, objectId: 'bootstrap-id' })).toBe('Maintainer');
    expect(getAccessRole('bootstrap-id')).toBe('Maintainer');
  });

  it('supports User and Maintainer assignments and protects the last maintainer', () => {
    setup();
    saveManagedUser(
      { objectId: 'maintainer', displayName: 'Maintainer', email: null, role: 'Maintainer' },
      'bootstrap'
    );
    saveManagedUser(
      { objectId: 'user', displayName: 'User', email: 'user@example.test', role: 'User' },
      'maintainer'
    );
    expect(listManagedUsers().map((user) => user.role)).toEqual(['Maintainer', 'User']);
    expect(() => removeManagedUser('maintainer')).toThrow(/At least one maintainer/);
    removeManagedUser('user');
    expect(getAccessRole('user')).toBeNull();
  });
});
