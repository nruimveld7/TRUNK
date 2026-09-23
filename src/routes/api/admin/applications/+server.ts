import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { applicationSchema, loadRegistry, saveApplicationOverride } from '$lib/server/registry';
import { refreshHealthMonitor } from '$lib/server/health';
const ensure = (locals: App.Locals) => {
  if (!locals.user || locals.accessRole !== 'Maintainer')
    throw error(403, 'Maintainer access required');
};
export const GET: RequestHandler = ({ locals }) => {
  ensure(locals);
  return json({ applications: loadRegistry().applications });
};
export const POST: RequestHandler = async ({ locals, request }) => {
  ensure(locals);
  const parsed = applicationSchema.safeParse(await request.json());
  if (!parsed.success)
    return json({ message: 'Invalid application', issues: parsed.error.issues }, { status: 400 });
  saveApplicationOverride(parsed.data, locals.user!.objectId);
  refreshHealthMonitor();
  return json({ ok: true, application: parsed.data });
};
