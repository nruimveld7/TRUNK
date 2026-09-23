import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteApplicationOverride } from '$lib/server/registry';
import { refreshHealthMonitor } from '$lib/server/health';
export const DELETE: RequestHandler = ({ locals, params }) => {
  if (!locals.user || locals.accessRole !== 'Maintainer')
    throw error(403, 'Maintainer access required');
  deleteApplicationOverride(params.id, locals.user.objectId);
  refreshHealthMonitor();
  return json({ ok: true });
};
