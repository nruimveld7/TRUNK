import type { AccessRole, MaintainerEntry, SessionUser } from '$lib/types';
import { getConfig } from './config';
import { getDatabase } from './database';

function bootstrapIds(): Set<string> {
  return new Set(
    getConfig()
      .BOOTSTRAP_MAINTAINER_OIDS.split(/[,;\s]+/)
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function isBootstrapMaintainer(objectId: string): boolean {
  return bootstrapIds().has(objectId);
}

export function syncIdentity(user: SessionUser): AccessRole {
  if (user.mock || isBootstrapMaintainer(user.objectId)) {
    getDatabase()
      .prepare(
        `INSERT INTO maintainers(object_id, display_name, created_by)
        VALUES (?, ?, 'bootstrap')
        ON CONFLICT(object_id) DO UPDATE SET display_name=excluded.display_name,
        updated_at=CURRENT_TIMESTAMP`
      )
      .run(user.objectId, user.displayName);
  }
  return getAccessRole(user.objectId);
}

export function getAccessRole(objectId: string): AccessRole {
  const row = getDatabase()
    .prepare('SELECT 1 AS found FROM maintainers WHERE object_id=?')
    .get(objectId);
  return row ? 'Maintainer' : 'User';
}

export function listMaintainers(): MaintainerEntry[] {
  return (
    getDatabase()
      .prepare('SELECT object_id, display_name FROM maintainers ORDER BY display_name')
      .all() as Array<{ object_id: string; display_name: string }>
  ).map((row) => ({ objectId: row.object_id, displayName: row.display_name }));
}

export function saveMaintainer(maintainer: MaintainerEntry, actorId: string): void {
  getDatabase()
    .prepare(
      `INSERT INTO maintainers(object_id, display_name, created_by)
      VALUES (?, ?, ?) ON CONFLICT(object_id) DO UPDATE SET display_name=excluded.display_name,
      updated_at=CURRENT_TIMESTAMP`
    )
    .run(maintainer.objectId, maintainer.displayName, actorId);
}

export function removeMaintainer(objectId: string): void {
  const row = getDatabase().prepare('SELECT COUNT(*) AS count FROM maintainers').get() as {
    count: number;
  };
  if (Number(row.count) <= 1) throw new Error('At least one maintainer is required');
  getDatabase().prepare('DELETE FROM maintainers WHERE object_id=?').run(objectId);
}
