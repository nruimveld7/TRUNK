import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { recordRecent, userKey } from '$lib/server/database';
import { loadRegistry, visibleApplications } from '$lib/server/registry';

const schema = z.object({ id: z.string() });

export const POST: RequestHandler = async ({ locals, request }) => {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return json({ message: 'Invalid application' }, { status: 400 });
  const application = visibleApplications(loadRegistry(), locals.user).find(
    (app) => app.id === parsed.data.id
  );
  if (!application) throw error(404, 'Application not found');
  if (locals.user) recordRecent(userKey(locals.user), application.id);
  return json({ ok: true, url: application.route.url });
};
