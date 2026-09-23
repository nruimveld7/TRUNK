import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { publicHealth } from '$lib/server/health';
import { loadRegistry, toPublicApplication, visibleApplications } from '$lib/server/registry';

export const GET: RequestHandler = ({ locals }) => {
  const apps = visibleApplications(
    loadRegistry(),
    locals.user && locals.accessRole ? locals.user : null
  ).map((app) => toPublicApplication(app, publicHealth(app.id).state));
  return json({ applications: apps });
};
