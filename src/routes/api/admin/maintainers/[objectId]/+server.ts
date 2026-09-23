import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isBootstrapMaintainer, listMaintainers, removeMaintainer } from '$lib/server/access';

export const DELETE: RequestHandler = ({ locals, params }) => {
  if (!locals.user || locals.accessRole !== 'Maintainer')
    throw error(403, 'Maintainer access required');
  if (params.objectId === locals.user.objectId)
    throw error(400, 'You cannot remove your own maintainer access');
  if (isBootstrapMaintainer(params.objectId))
    throw error(400, 'Bootstrap maintainers must be removed through deployment configuration');
  const target = listMaintainers().find((maintainer) => maintainer.objectId === params.objectId);
  try {
    removeMaintainer(params.objectId);
  } catch (cause) {
    throw error(400, cause instanceof Error ? cause.message : 'Unable to remove maintainer');
  }
  return json({ ok: true, removed: target?.displayName ?? params.objectId });
};
