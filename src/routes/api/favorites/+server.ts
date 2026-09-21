import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { getFavorites, saveFavorites, userKey } from '$lib/server/database';
import { loadRegistry, visibleApplications } from '$lib/server/registry';

const schema = z.object({ ids: z.array(z.string()).max(100) });

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) throw error(401, 'Authentication required');
  return json({ ids: getFavorites(userKey(locals.user)) });
};

export const PUT: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) throw error(401, 'Authentication required');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return json({ message: 'Invalid favorites' }, { status: 400 });
  const available = new Set(visibleApplications(loadRegistry(), locals.user).map((app) => app.id));
  const ids = [...new Set(parsed.data.ids)].filter((id) => available.has(id));
  saveFavorites(userKey(locals.user), ids);
  return json({ ids });
};
