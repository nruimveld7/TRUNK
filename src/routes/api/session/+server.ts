import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getConfig } from '$lib/server/config';

export const GET: RequestHandler = ({ locals }) =>
  json({
    user: locals.user,
    authenticated: Boolean(locals.user),
    authMode: getConfig().AUTH_MODE,
    csrfToken: locals.csrfToken
  });
