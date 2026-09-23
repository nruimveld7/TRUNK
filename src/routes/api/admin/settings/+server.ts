import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { getConfig } from '$lib/server/config';
import { getSiteSetting, saveSiteSetting } from '$lib/server/registry';

const schema = z.object({
  siteName: z.string().trim().min(1).max(60),
  siteDescription: z.string().trim().min(1).max(160),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/)
});
const ensure = (locals: App.Locals) => {
  if (!locals.user || locals.accessRole !== 'Maintainer')
    throw error(403, 'Maintainer access required');
};
export const GET: RequestHandler = ({ locals }) => {
  ensure(locals);
  const config = getConfig();
  return json({
    siteName: getSiteSetting('siteName', config.TRUNK_SITE_NAME),
    siteDescription: getSiteSetting('siteDescription', config.TRUNK_SITE_DESCRIPTION),
    accentColor: getSiteSetting('accentColor', config.TRUNK_ACCENT_COLOR)
  });
};
export const PUT: RequestHandler = async ({ locals, request }) => {
  ensure(locals);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return json({ message: 'Invalid site settings' }, { status: 400 });
  saveSiteSetting('siteName', parsed.data.siteName, locals.user!.objectId);
  saveSiteSetting('siteDescription', parsed.data.siteDescription, locals.user!.objectId);
  saveSiteSetting('accentColor', parsed.data.accentColor, locals.user!.objectId);
  return json(parsed.data);
};
