import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { redeemAuthorizationCode } from '$lib/server/auth';
import { consumeAuthTransaction, setSessionUser } from '$lib/server/session';

export const GET: RequestHandler = async ({ locals, url }) => {
  if (!locals.sessionId) throw error(400, 'Session unavailable');
  const transaction = consumeAuthTransaction(locals.sessionId);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const authError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (authError) throw error(401, `Microsoft sign-in failed: ${authError}`);
  if (!transaction || !code || !state || state !== transaction.state)
    throw error(400, 'Authentication state validation failed');
  const user = await redeemAuthorizationCode(code, transaction.verifier, transaction.nonce);
  setSessionUser(locals.sessionId, user);
  throw redirect(303, '/');
};
