import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadRegistry, visibleApplications } from '../../src/lib/server/registry';
import type { SessionUser } from '../../src/lib/types';

const user: SessionUser = { subject: 's', tenantId: 't', objectId: 'o', displayName: 'Tester' };
const temporary: string[] = [];
afterEach(() => {
  vi.unstubAllEnvs();
  for (const directory of temporary.splice(0))
    fs.rmSync(directory, { recursive: true, force: true });
});

describe('application registry', () => {
  it('filters authenticated applications from guests', () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('ENABLE_DEMO_APPS', 'true');
    const registry = loadRegistry(path.resolve('config/applications.yaml'));
    const guests = visibleApplications(registry, null, true);
    const signedIn = visibleApplications(registry, user, true);
    expect(guests.every((app) => app.access.visibility === 'guest')).toBe(true);
    expect(signedIn.some((app) => app.access.visibility === 'authenticated')).toBe(true);
    expect(signedIn.length).toBeGreaterThan(guests.length);
  });

  it('rejects duplicate application ids', () => {
    vi.stubEnv('NODE_ENV', 'test');
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'trunk-registry-'));
    temporary.push(directory);
    const file = path.join(directory, 'apps.yaml');
    fs.writeFileSync(
      file,
      `categories: [{name: General, order: 1}]\napplications:\n${['one', 'two'].map(() => `  - id: duplicate\n    display: {name: App, description: Test app, category: General, icon: tool, order: 1, new: false}\n    route: {url: null}\n    access: {visibility: guest}\n    search: {tags: []}\n    health: {type: none}`).join('\n')}\n`
    );
    expect(() => loadRegistry(file)).toThrow(/duplicate id/);
  });
});
