import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import type { SessionUser } from '$lib/types';
import { getConfig } from './config';
import { getDatabase } from './database';

const COOKIE_NAME = 'trunk_session';
type SessionRow = {
  id: string;
  user_json: string | null;
  csrf_token: string;
  expires_at: number;
};

const token = (bytes = 32) => randomBytes(bytes).toString('base64url');

function sign(id: string): string {
  return createHmac('sha256', getConfig().SESSION_SECRET).update(id).digest('base64url');
}

function encodeCookie(id: string): string {
  return `${id}.${sign(id)}`;
}

function decodeCookie(value: string | undefined): string | null {
  if (!value) return null;
  const [id, signature, extra] = value.split('.');
  if (!id || !signature || extra) return null;
  const expected = Buffer.from(sign(id));
  const supplied = Buffer.from(signature);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected) ? id : null;
}

function cookieOptions(maxAge: number) {
  return {
    path: '/',
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: getConfig().NODE_ENV === 'production',
    maxAge
  };
}

export function createSession(
  cookies: Cookies,
  user: SessionUser | null = null
): { id: string; csrfToken: string } {
  const config = getConfig();
  const id = token();
  const csrfToken = token();
  const now = Math.floor(Date.now() / 1000);
  getDatabase()
    .prepare(
      'INSERT INTO sessions(id, user_json, csrf_token, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .run(id, user ? JSON.stringify(user) : null, csrfToken, now + config.SESSION_TTL_SECONDS, now);
  cookies.set(COOKIE_NAME, encodeCookie(id), cookieOptions(config.SESSION_TTL_SECONDS));
  return { id, csrfToken };
}

export function resolveSession(cookies: Cookies): {
  id: string;
  csrfToken: string;
  user: SessionUser | null;
} {
  const now = Math.floor(Date.now() / 1000);
  const id = decodeCookie(cookies.get(COOKIE_NAME));
  if (id) {
    const row = getDatabase()
      .prepare('SELECT id, user_json, csrf_token, expires_at FROM sessions WHERE id = ?')
      .get(id) as SessionRow | undefined;
    if (row && row.expires_at > now) {
      return {
        id: row.id,
        csrfToken: row.csrf_token,
        user: row.user_json ? (JSON.parse(row.user_json) as SessionUser) : null
      };
    }
    getDatabase().prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }
  return { ...createSession(cookies), user: null };
}

export function setSessionUser(sessionId: string, user: SessionUser | null): void {
  getDatabase()
    .prepare('UPDATE sessions SET user_json = ? WHERE id = ?')
    .run(user ? JSON.stringify(user) : null, sessionId);
}

export function destroySession(cookies: Cookies, sessionId: string | null): void {
  if (sessionId) getDatabase().prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
  cookies.delete(COOKIE_NAME, { path: '/' });
}

export function setAuthTransaction(
  sessionId: string,
  state: string,
  nonce: string,
  verifier: string
): void {
  getDatabase()
    .prepare('UPDATE sessions SET auth_state = ?, auth_nonce = ?, auth_verifier = ? WHERE id = ?')
    .run(state, nonce, verifier, sessionId);
}

export function consumeAuthTransaction(
  sessionId: string
): { state: string; nonce: string; verifier: string } | null {
  const row = getDatabase()
    .prepare('SELECT auth_state, auth_nonce, auth_verifier FROM sessions WHERE id = ?')
    .get(sessionId) as
    | { auth_state: string | null; auth_nonce: string | null; auth_verifier: string | null }
    | undefined;
  getDatabase()
    .prepare(
      'UPDATE sessions SET auth_state=NULL, auth_nonce=NULL, auth_verifier=NULL WHERE id = ?'
    )
    .run(sessionId);
  return row?.auth_state && row.auth_nonce && row.auth_verifier
    ? { state: row.auth_state, nonce: row.auth_nonce, verifier: row.auth_verifier }
    : null;
}
