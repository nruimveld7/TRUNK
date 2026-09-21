import { describe, expect, it } from 'vitest';
import { getConfig } from '../../src/lib/server/config';

describe('runtime configuration', () => {
  it('rejects mock authentication in production', () => {
    expect(() =>
      getConfig({ NODE_ENV: 'production', AUTH_MODE: 'mock', SESSION_SECRET: 'a'.repeat(32) })
    ).toThrow(/forbidden/);
  });

  it('requires all Entra values', () => {
    expect(() =>
      getConfig({ NODE_ENV: 'production', AUTH_MODE: 'entra', SESSION_SECRET: 'a'.repeat(32) })
    ).toThrow(/ENTRA_TENANT_ID/);
  });

  it('accepts a complete tenant-specific Entra configuration', () => {
    const config = getConfig({
      NODE_ENV: 'production',
      AUTH_MODE: 'entra',
      SESSION_SECRET: 'a'.repeat(32),
      ENTRA_TENANT_ID: 'tenant',
      ENTRA_CLIENT_ID: 'client',
      ENTRA_CLIENT_SECRET: 'secret',
      ENTRA_REDIRECT_URI: 'https://trunk.example.test/auth/callback'
    });
    expect(config.AUTH_MODE).toBe('entra');
  });

  it('supports deployment-specific site branding', () => {
    const config = getConfig({
      NODE_ENV: 'test',
      AUTH_MODE: 'mock',
      TRUNK_SITE_NAME: 'North Plant',
      TRUNK_SITE_DESCRIPTION: 'Engineering application launcher',
      SESSION_SECRET: 'a'.repeat(32)
    });
    expect(config.TRUNK_SITE_NAME).toBe('North Plant');
    expect(config.TRUNK_SITE_DESCRIPTION).toBe('Engineering application launcher');
  });
});
