import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { publicHealth } from '$lib/server/health';
import { loadRegistry, visibleApplications } from '$lib/server/registry';

export const GET: RequestHandler = ({ locals }) =>
  json({
    statuses: visibleApplications(loadRegistry(), locals.user).map((app) => publicHealth(app.id))
  });
