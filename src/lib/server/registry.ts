import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import type { PublicApplication, SessionUser } from '$lib/types';
import { getConfig } from './config';

const healthSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({
    type: z.literal('http'),
    url: z.string().url(),
    intervalSeconds: z.number().int().min(5).optional(),
    expectedStatus: z.number().int().min(100).max(599).default(200)
  })
]);

const applicationSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  display: z.object({
    name: z.string().min(1),
    description: z.string().min(1).max(180),
    category: z.string().min(1),
    icon: z.string().min(1),
    order: z.number().int().nonnegative(),
    new: z.boolean().default(false)
  }),
  route: z.object({ url: z.string().url().or(z.string().startsWith('/')).nullable() }),
  access: z.object({ visibility: z.enum(['guest', 'authenticated']) }),
  search: z.object({ tags: z.array(z.string()).default([]) }),
  health: healthSchema.default({ type: 'none' }),
  demo: z.boolean().default(false)
});

const registrySchema = z.object({
  categories: z.array(z.object({ name: z.string(), order: z.number().int() })),
  applications: z.array(applicationSchema)
});

export type RegistryApplication = z.infer<typeof applicationSchema>;
export type Registry = z.infer<typeof registrySchema>;
let cached: Registry | undefined;

export function loadRegistry(registryPath = getConfig().APPLICATION_REGISTRY_PATH): Registry {
  if (cached && registryPath === getConfig().APPLICATION_REGISTRY_PATH) return cached;
  const absolutePath = path.resolve(registryPath);
  let document: unknown;
  try {
    document = YAML.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    throw new Error(
      `Unable to read application registry at ${absolutePath}: ${error instanceof Error ? error.message : 'unknown error'}`
    );
  }
  const parsed = registrySchema.safeParse(document);
  if (!parsed.success) throw new Error(`Invalid application registry: ${parsed.error.message}`);
  const ids = new Set<string>();
  for (const app of parsed.data.applications) {
    if (ids.has(app.id)) throw new Error(`Invalid application registry: duplicate id "${app.id}"`);
    ids.add(app.id);
  }
  if (registryPath === getConfig().APPLICATION_REGISTRY_PATH) cached = parsed.data;
  return parsed.data;
}

export function visibleApplications(
  registry: Registry,
  user: SessionUser | null,
  includeDemo = getConfig().ENABLE_DEMO_APPS
): RegistryApplication[] {
  return registry.applications
    .filter((app) => includeDemo || !app.demo)
    .filter((app) => app.access.visibility === 'guest' || Boolean(user))
    .sort((a, b) => {
      const categories = new Map(
        registry.categories.map((category) => [category.name, category.order])
      );
      return (
        (categories.get(a.display.category) ?? 9999) -
          (categories.get(b.display.category) ?? 9999) ||
        a.display.order - b.display.order ||
        a.id.localeCompare(b.id)
      );
    });
}

export function searchApplications(
  applications: RegistryApplication[],
  query: string
): RegistryApplication[] {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return applications;
  return applications.filter((app) => {
    const haystack = [
      app.display.name,
      app.display.description,
      app.display.category,
      ...app.search.tags
    ]
      .join(' ')
      .toLocaleLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

export function toPublicApplication(
  app: RegistryApplication,
  health: PublicApplication['health'] = 'unknown'
): PublicApplication {
  return {
    id: app.id,
    name: app.display.name,
    description: app.display.description,
    category: app.display.category,
    icon: app.display.icon,
    order: app.display.order,
    isNew: app.display.new,
    url: app.route.url,
    external: Boolean(app.route.url && /^https?:\/\//.test(app.route.url)),
    demo: app.demo,
    visibility: app.access.visibility,
    tags: app.search.tags,
    health
  };
}

export function resetRegistryForTests(): void {
  cached = undefined;
}
