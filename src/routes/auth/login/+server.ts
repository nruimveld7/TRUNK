import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { authorizationRequest, MOCK_USER } from '$lib/server/auth';
import { getConfig } from '$lib/server/config';
import { setAuthTransaction, setSessionUser } from '$lib/server/session';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.sessionId) throw error(500, 'Session unavailable');
  if (getConfig().AUTH_MODE === 'mock') {
    if (getConfig().NODE_ENV === 'production') throw error(503, 'Mock authentication is disabled');
    setSessionUser(locals.sessionId, MOCK_USER);
    throw redirect(303, '/');
  }
  const transaction = await authorizationRequest();
  setAuthTransaction(locals.sessionId, transaction.state, transaction.nonce, transaction.verifier);
  throw redirect(303, transaction.url);
};
