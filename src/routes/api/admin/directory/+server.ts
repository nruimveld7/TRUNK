import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchDirectoryUsers } from '$lib/server/graph';
import { getSessionAccessToken } from '$lib/server/session';
export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.sessionId || locals.accessRole !== 'Maintainer')
    throw error(403, 'Maintainer access required');
  const token = getSessionAccessToken(locals.sessionId);
  if (!token) throw error(401, 'Directory token expired; sign in again');
  return json({ users: await searchDirectoryUsers(token, url.searchParams.get('q') ?? '') });
};
