import { dev } from '$app/environment';
import { z } from 'zod';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    TRUNK_SITE_NAME: z.string().trim().min(1).max(60).default('Operations'),
    TRUNK_SITE_DESCRIPTION: z
      .string()
      .trim()
      .min(1)
      .max(160)
      .default('Central launcher for tools and applications'),
    TRUNK_ACCENT_COLOR: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default('#2563eb'),
    AUTH_MODE: z.enum(['mock', 'entra']).default('mock'),
    ENTRA_TENANT_ID: z.string().optional(),
    ENTRA_CLIENT_ID: z.string().optional(),
    ENTRA_CLIENT_SECRET: z.string().optional(),
    ENTRA_CLIENT_CERT_PRIVATE_KEY_PATH: z.string().optional(),
    ENTRA_CLIENT_CERT_PUBLIC_CERT_PATH: z.string().optional(),
    ENTRA_REDIRECT_URI: z.string().url().optional(),
    ENTRA_POST_LOGOUT_REDIRECT_URI: z.string().url().optional(),
    SESSION_SECRET: z.string().min(32).default('development-only-session-secret-change-me'),
    SESSION_TTL_SECONDS: z.coerce.number().int().min(300).default(28800),
    BOOTSTRAP_MAINTAINER_OIDS: z.string().default(''),
    SMTP_RELAY_HOST: z.string().default(''),
    SMTP_MAIL_FROM: z.string().default(''),
    EMAIL_RECIPIENT_OVERRIDE: z.string().default(''),
    DATABASE_PATH: z.string().default('./data/trunk.db'),
    APPLICATION_REGISTRY_PATH: z.string().default('./config/applications.yaml'),
    ENABLE_DEMO_APPS: z
      .string()
      .default('false')
      .transform((value) => value === 'true'),
    HEALTH_DEFAULT_INTERVAL_SECONDS: z.coerce.number().int().min(5).default(30),
    HEALTH_TIMEOUT_MS: z.coerce.number().int().min(500).default(5000)
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV === 'production' && value.AUTH_MODE === 'mock') {
      context.addIssue({ code: 'custom', message: 'AUTH_MODE=mock is forbidden in production' });
    }
    if (value.AUTH_MODE === 'entra') {
      for (const key of ['ENTRA_TENANT_ID', 'ENTRA_CLIENT_ID', 'ENTRA_REDIRECT_URI'] as const) {
        if (!value[key])
          context.addIssue({ code: 'custom', path: [key], message: `${key} is required` });
      }
      const hasSecret = Boolean(value.ENTRA_CLIENT_SECRET);
      const hasCertificate = Boolean(
        value.ENTRA_CLIENT_CERT_PRIVATE_KEY_PATH && value.ENTRA_CLIENT_CERT_PUBLIC_CERT_PATH
      );
      if (!hasSecret && !hasCertificate) {
        context.addIssue({
          code: 'custom',
          message:
            'Configure ENTRA_CLIENT_SECRET or both ENTRA_CLIENT_CERT_PRIVATE_KEY_PATH and ENTRA_CLIENT_CERT_PUBLIC_CERT_PATH'
        });
      }
    }
  });

export type RuntimeConfig = z.infer<typeof envSchema>;
let cached: RuntimeConfig | undefined;

export function getConfig(environment: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  if (environment === process.env && cached) return cached;
  const parsed = envSchema.safeParse({
    ...environment,
    NODE_ENV: environment.NODE_ENV ?? (dev ? 'development' : 'production')
  });
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid TRUNK configuration: ${detail}`);
  }
  if (environment === process.env) cached = parsed.data;
  return parsed.data;
}

export function resetConfigForTests(): void {
  cached = undefined;
}
