import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getConfig } from '$lib/server/config';
import { destroySession } from '$lib/server/session';

export const POST: RequestHandler = ({ cookies, locals, url }) => {
  const config = getConfig();
  destroySession(cookies, locals.sessionId);
  if (config.AUTH_MODE === 'entra') {
    const target = config.ENTRA_POST_LOGOUT_REDIRECT_URI ?? new URL('/', url).toString();
    const endpoint = new URL(
      `https://login.microsoftonline.com/${config.ENTRA_TENANT_ID}/oauth2/v2.0/logout`
    );
    endpoint.searchParams.set('post_logout_redirect_uri', target);
    throw redirect(303, endpoint.toString());
  }
  throw redirect(303, '/');
};
