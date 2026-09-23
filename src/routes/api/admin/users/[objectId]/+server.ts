import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isBootstrapMaintainer, listManagedUsers, removeManagedUser } from '$lib/server/access';
import { getConfig } from '$lib/server/config';
import { sendAccessNotification } from '$lib/server/mail';
import { getSiteSetting } from '$lib/server/registry';

export const DELETE: RequestHandler = ({ locals, params }) => {
  if (!locals.user || locals.accessRole !== 'Maintainer')
    throw error(403, 'Maintainer access required');
  if (params.objectId === locals.user.objectId)
    throw error(400, 'You cannot remove your own access');
  if (isBootstrapMaintainer(params.objectId))
    throw error(400, 'Bootstrap maintainers must be removed through deployment configuration');
  const target = listManagedUsers().find((user) => user.objectId === params.objectId);
  try {
    removeManagedUser(params.objectId);
  } catch (cause) {
    throw error(400, cause instanceof Error ? cause.message : 'Unable to remove user');
  }
  if (target) {
    const config = getConfig();
    void sendAccessNotification({
      recipient: target.email,
      displayName: target.displayName,
      role: null,
      siteName: getSiteSetting('siteName', config.TRUNK_SITE_NAME)
    }).catch((cause) => console.error('[mail] access notification failed', cause));
  }
  return json({ ok: true, removed: target?.displayName ?? params.objectId });
};
