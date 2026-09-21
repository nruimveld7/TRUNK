import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { getPreferences, savePreferences, userKey } from '$lib/server/database';

const schema = z.object({
  appearance: z.enum(['system', 'light', 'dark']),
  launchBehavior: z.enum(['same', 'new']),
  density: z.enum(['comfortable', 'compact'])
});

export const GET: RequestHandler = ({ locals }) => {
  if (!locals.user) throw error(401, 'Authentication required');
  return json(getPreferences(userKey(locals.user)));
};

export const PUT: RequestHandler = async ({ locals, request }) => {
  if (!locals.user) throw error(401, 'Authentication required');
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success)
    return json({ message: 'Invalid preferences', issues: parsed.error.issues }, { status: 400 });
  savePreferences(userKey(locals.user), parsed.data);
  return json(parsed.data);
};
