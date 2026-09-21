import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getRecent, userKey } from '$lib/server/database';

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) throw error(401, 'Authentication required');
  return json({ ids: getRecent(userKey(locals.user)) });
};
