import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { listMaintainers, saveMaintainer } from '$lib/server/access';
import { getConfig } from '$lib/server/config';
import { sendAccessNotification } from '$lib/server/mail';
import { getSiteSetting } from '$lib/server/registry';

const schema = z.object({
  objectId: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  email: z.string().email().nullable().optional()
});

function ensureMaintainer(locals: App.Locals): void {
  if (!locals.user || locals.accessRole !== 'Maintainer')
    throw error(403, 'Maintainer access required');
}

export const GET: RequestHandler = ({ locals }) => {
  ensureMaintainer(locals);
  return json({ maintainers: listMaintainers() });
};

export const POST: RequestHandler = async ({ locals, request }) => {
  ensureMaintainer(locals);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return json({ message: 'Invalid maintainer' }, { status: 400 });
  saveMaintainer(
    { objectId: parsed.data.objectId, displayName: parsed.data.displayName },
    locals.user!.objectId
  );
  const config = getConfig();
  void sendAccessNotification({
    recipient: parsed.data.email ?? null,
    displayName: parsed.data.displayName,
    role: 'Maintainer',
    siteName: getSiteSetting('siteName', config.TRUNK_SITE_NAME)
  }).catch((cause) => console.error('[mail] maintainer notification failed', cause));
  return json({ ok: true });
};
