import { error, json, type Handle, type HandleServerError } from '@sveltejs/kit';
import { getConfig } from '$lib/server/config';
import { syncIdentity } from '$lib/server/access';
import { getDatabase } from '$lib/server/database';
import { startHealthMonitor } from '$lib/server/health';
import { loadRegistry } from '$lib/server/registry';
import { resolveSession } from '$lib/server/session';

let initialized = false;

function initialize(): void {
  if (initialized) return;
  getConfig();
  getDatabase();
  loadRegistry();
  startHealthMonitor();
  initialized = true;
}

export const handle: Handle = async ({ event, resolve }) => {
  initialize();
  const session = resolveSession(event.cookies);
  event.locals.sessionId = session.id;
  event.locals.user = session.user;
  event.locals.accessRole = session.user ? syncIdentity(session.user) : null;
  event.locals.csrfToken = session.csrfToken;

  if (!['GET', 'HEAD', 'OPTIONS'].includes(event.request.method)) {
    const supplied = event.request.headers.get('x-csrf-token');
    if (!supplied || supplied !== session.csrfToken) {
      if (event.url.pathname.startsWith('/api/'))
        return json({ message: 'Invalid CSRF token' }, { status: 403 });
      throw error(403, 'Invalid CSRF token');
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders: (name) => name.toLowerCase() === 'content-type'
  });
};

export const handleError: HandleServerError = ({ error: cause, event }) => {
  console.error(`[TRUNK] ${event.request.method} ${event.url.pathname}`, cause);
  return { message: 'TRUNK could not complete this request. Please try again.' };
};
