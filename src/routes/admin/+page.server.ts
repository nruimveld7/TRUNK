import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { listManagedUsers } from '$lib/server/access';
import { getConfig } from '$lib/server/config';
import { getSiteSetting, loadRegistry } from '$lib/server/registry';

export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) throw redirect(303, '/auth/login');
  if (locals.accessRole !== 'Maintainer') throw error(403, 'Maintainer access required');
  const config = getConfig();
  return {
    managedUsers: listManagedUsers(),
    registryApplications: loadRegistry().applications,
    settings: {
      siteName: getSiteSetting('siteName', config.TRUNK_SITE_NAME),
      siteDescription: getSiteSetting('siteDescription', config.TRUNK_SITE_DESCRIPTION),
      accentColor: getSiteSetting('accentColor', config.TRUNK_ACCENT_COLOR)
    }
  };
};
