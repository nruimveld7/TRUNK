import type { LayoutServerLoad } from './$types';
import { getConfig } from '$lib/server/config';
import {
  DEFAULT_PREFERENCES,
  getFavorites,
  getPreferences,
  getRecent,
  userKey
} from '$lib/server/database';
import { publicHealth } from '$lib/server/health';
import {
  getSiteSetting,
  loadRegistry,
  toPublicApplication,
  visibleApplications
} from '$lib/server/registry';

export const load: LayoutServerLoad = async ({ locals }) => {
  const config = getConfig();
  const registry = loadRegistry();
  const applications = visibleApplications(
    registry,
    locals.user && locals.accessRole ? locals.user : null
  ).map((app) => toPublicApplication(app, publicHealth(app.id).state));
  const key = locals.user ? userKey(locals.user) : null;
  return {
    user: locals.user,
    accessRole: locals.accessRole,
    authMode: config.AUTH_MODE,
    mockMode: config.AUTH_MODE === 'mock',
    siteName: getSiteSetting('siteName', config.TRUNK_SITE_NAME),
    siteDescription: getSiteSetting('siteDescription', config.TRUNK_SITE_DESCRIPTION),
    accentColor: getSiteSetting('accentColor', config.TRUNK_ACCENT_COLOR),
    csrfToken: locals.csrfToken,
    applications,
    categories: registry.categories.slice().sort((a, b) => a.order - b.order),
    preferences: key ? getPreferences(key) : DEFAULT_PREFERENCES,
    favoriteIds: key ? getFavorites(key) : [],
    recentIds: key ? getRecent(key) : []
  };
};
