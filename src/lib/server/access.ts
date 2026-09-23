import type { AccessRole, ManagedUser, SessionUser } from '$lib/types';
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

export function syncIdentity(user: SessionUser): AccessRole | null {
  const db = getDatabase();
  if (user.mock || bootstrapIds().has(user.objectId)) {
    db.prepare(
      `INSERT INTO access_users(object_id, display_name, email, role, created_by)
      VALUES (?, ?, ?, 'Maintainer', 'bootstrap')
      ON CONFLICT(object_id) DO UPDATE SET display_name=excluded.display_name,
      email=excluded.email, role='Maintainer', updated_at=CURRENT_TIMESTAMP`
    ).run(user.objectId, user.displayName, user.email ?? null);
  } else {
    db.prepare(
      `UPDATE access_users SET display_name=?, email=?, updated_at=CURRENT_TIMESTAMP
      WHERE object_id=?`
    ).run(user.displayName, user.email ?? null, user.objectId);
  }
  return getAccessRole(user.objectId);
}

export function getAccessRole(objectId: string): AccessRole | null {
  const row = getDatabase()
    .prepare('SELECT role FROM access_users WHERE object_id=?')
    .get(objectId) as { role: AccessRole } | undefined;
  return row?.role ?? null;
}

export function listManagedUsers(): ManagedUser[] {
  return (
    getDatabase()
      .prepare(
        `SELECT object_id, display_name, email, role FROM access_users
    ORDER BY CASE role WHEN 'Maintainer' THEN 0 ELSE 1 END, display_name`
      )
      .all() as Array<{
      object_id: string;
      display_name: string;
      email: string | null;
      role: AccessRole;
    }>
  ).map((row) => ({
    objectId: row.object_id,
    displayName: row.display_name,
    email: row.email,
    role: row.role
  }));
}

export function saveManagedUser(user: ManagedUser, actorId: string): void {
  getDatabase()
    .prepare(
      `INSERT INTO access_users(object_id, display_name, email, role, created_by)
    VALUES (?, ?, ?, ?, ?) ON CONFLICT(object_id) DO UPDATE SET display_name=excluded.display_name,
    email=excluded.email, role=excluded.role, updated_at=CURRENT_TIMESTAMP`
    )
    .run(user.objectId, user.displayName, user.email, user.role, actorId);
}

export function removeManagedUser(objectId: string): void {
  const row = getDatabase()
    .prepare("SELECT COUNT(*) AS count FROM access_users WHERE role='Maintainer'")
    .get() as { count: number };
  const target = getAccessRole(objectId);
  if (target === 'Maintainer' && Number(row.count) <= 1)
    throw new Error('At least one maintainer is required');
  getDatabase().prepare('DELETE FROM access_users WHERE object_id=?').run(objectId);
}
