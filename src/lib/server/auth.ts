import { createHash, randomBytes } from 'node:crypto';
import { ConfidentialClientApplication, CryptoProvider, type AccountInfo } from '@azure/msal-node';
import type { SessionUser } from '$lib/types';
import { getConfig } from './config';

function client(): ConfidentialClientApplication {
  const config = getConfig();
  return new ConfidentialClientApplication({
    auth: {
      clientId: config.ENTRA_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${config.ENTRA_TENANT_ID}`,
      clientSecret: config.ENTRA_CLIENT_SECRET!
    }
  });
}

export async function authorizationRequest(): Promise<{
  url: string;
  state: string;
  nonce: string;
  verifier: string;
}> {
  const config = getConfig();
  const state = randomBytes(32).toString('base64url');
  const nonce = randomBytes(32).toString('base64url');
  const { verifier, challenge } = await new CryptoProvider().generatePkceCodes();
  const url = await client().getAuthCodeUrl({
    scopes: ['openid', 'profile', 'email'],
    redirectUri: config.ENTRA_REDIRECT_URI!,
    state,
    nonce,
    codeChallenge: challenge,
    codeChallengeMethod: 'S256'
  });
  return { url, state, nonce, verifier };
}

export async function redeemAuthorizationCode(
  code: string,
  verifier: string,
  expectedNonce: string
): Promise<SessionUser> {
  const config = getConfig();
  const result = await client().acquireTokenByCode({
    code,
    scopes: ['openid', 'profile', 'email'],
    redirectUri: config.ENTRA_REDIRECT_URI!,
    codeVerifier: verifier
  });
  const claims = result.idTokenClaims as Record<string, unknown> | undefined;
  if (!claims || claims.nonce !== expectedNonce)
    throw new Error('Authentication nonce validation failed');
  if (claims.tid !== config.ENTRA_TENANT_ID)
    throw new Error('Authentication tenant validation failed');
  const objectId = String(claims.oid ?? '');
  if (!objectId) throw new Error('Authenticated identity has no object ID');
  return accountToUser(result.account, claims, objectId);
}

function accountToUser(
  account: AccountInfo | null,
  claims: Record<string, unknown>,
  objectId: string
): SessionUser {
  const tenantId = String(claims.tid);
  return {
    subject: String(
      claims.sub ?? createHash('sha256').update(`${tenantId}:${objectId}`).digest('hex')
    ),
    tenantId,
    objectId,
    displayName: String(claims.name ?? account?.name ?? 'Organization user'),
    email: typeof claims.preferred_username === 'string' ? claims.preferred_username : undefined,
    department: typeof claims.department === 'string' ? claims.department : undefined
  };
}

export const MOCK_USER: SessionUser = {
  subject: 'mock-user',
  tenantId: 'mock-tenant',
  objectId: 'mock-object',
  displayName: 'Development User',
  email: 'developer@example.invalid',
  department: 'Mock mode',
  mock: true
};
