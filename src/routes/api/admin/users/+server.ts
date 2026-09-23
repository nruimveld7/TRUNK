import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { isBootstrapMaintainer, listManagedUsers, saveManagedUser } from '$lib/server/access';
import { getConfig } from '$lib/server/config';
import { sendAccessNotification } from '$lib/server/mail';
import { getSiteSetting } from '$lib/server/registry';
const schema = z.object({
  objectId: z.string().min(1),
  displayName: z.string().min(1),
  email: z.string().email().nullable(),
  role: z.enum(['User', 'Maintainer'])
});
const ensure = (locals: App.Locals) => {
  if (!locals.user || locals.accessRole !== 'Maintainer')
    throw error(403, 'Maintainer access required');
};
export const GET: RequestHandler = ({ locals }) => {
  ensure(locals);
  return json({ users: listManagedUsers() });
};
export const POST: RequestHandler = async ({ locals, request }) => {
  ensure(locals);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return json({ message: 'Invalid user' }, { status: 400 });
  if (isBootstrapMaintainer(parsed.data.objectId) && parsed.data.role !== 'Maintainer')
    return json({ message: 'Bootstrap maintainers cannot be demoted in the UI' }, { status: 400 });
  saveManagedUser(parsed.data, locals.user!.objectId);
  const config = getConfig();
  void sendAccessNotification({
    recipient: parsed.data.email,
    displayName: parsed.data.displayName,
    role: parsed.data.role,
    siteName: getSiteSetting('siteName', config.TRUNK_SITE_NAME)
  }).catch((cause) => console.error('[mail] access notification failed', cause));
  return json({ ok: true });
};
