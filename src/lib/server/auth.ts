import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs';
import { ConfidentialClientApplication, CryptoProvider, type AccountInfo } from '@azure/msal-node';
import type { SessionUser } from '$lib/types';
import { getConfig } from './config';

function client(): ConfidentialClientApplication {
  const config = getConfig();
  const certificate =
    config.ENTRA_CLIENT_CERT_PRIVATE_KEY_PATH && config.ENTRA_CLIENT_CERT_PUBLIC_CERT_PATH
      ? loadCertificate(
          config.ENTRA_CLIENT_CERT_PRIVATE_KEY_PATH,
          config.ENTRA_CLIENT_CERT_PUBLIC_CERT_PATH
        )
      : undefined;
  return new ConfidentialClientApplication({
    auth: {
      clientId: config.ENTRA_CLIENT_ID!,
      authority: `https://login.microsoftonline.com/${config.ENTRA_TENANT_ID}`,
      ...(certificate
        ? { clientCertificate: certificate }
        : { clientSecret: config.ENTRA_CLIENT_SECRET! })
    }
  });
}

function loadCertificate(privateKeyPath: string, certificatePath: string) {
  const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  const certificate = fs.readFileSync(certificatePath, 'utf8');
  const der = Buffer.from(
    certificate.replace(/-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s+/g, ''),
    'base64'
  );
  return {
    privateKey,
    thumbprint: createHash('sha1').update(der).digest('hex').toUpperCase(),
    thumbprintSha256: createHash('sha256').update(der).digest('hex').toUpperCase()
  };
}

const SCOPES = ['openid', 'profile', 'email', 'offline_access', 'User.ReadBasic.All'];

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
    scopes: SCOPES,
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
): Promise<{ user: SessionUser; accessToken: string; expiresAt: number }> {
  const config = getConfig();
  const result = await client().acquireTokenByCode({
    code,
    scopes: SCOPES,
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
  return {
    user: accountToUser(result.account, claims, objectId),
    accessToken: result.accessToken,
    expiresAt: result.expiresOn?.getTime() ?? Date.now() + 50 * 60 * 1000
  };
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
