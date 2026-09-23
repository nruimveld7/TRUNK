import type { HealthPublic, HealthState } from '$lib/types';
import { getConfig } from './config';
import { loadRegistry, type RegistryApplication } from './registry';

type HealthRecord = HealthPublic & { lastError: string | null };
const records = new Map<string, HealthRecord>();
const timers = new Map<string, ReturnType<typeof setInterval>>();

export function stateFromResponse(status: number, expected: number): HealthState {
  if (status === expected) return 'online';
  if (status >= 200 && status < 500) return 'degraded';
  return 'offline';
}

async function probe(app: RegistryApplication): Promise<void> {
  if (app.health.type === 'none') {
    records.set(app.id, {
      id: app.id,
      state: 'unknown',
      lastChecked: null,
      responseTimeMs: null,
      lastError: null
    });
    return;
  }
  const started = performance.now();
  try {
    const response = await fetch(app.health.url, {
      signal: AbortSignal.timeout(getConfig().HEALTH_TIMEOUT_MS),
      redirect: 'manual'
    });
    records.set(app.id, {
      id: app.id,
      state: stateFromResponse(response.status, app.health.expectedStatus),
      lastChecked: new Date().toISOString(),
      responseTimeMs: Math.round(performance.now() - started),
      lastError: null
    });
  } catch (error) {
    records.set(app.id, {
      id: app.id,
      state: 'offline',
      lastChecked: new Date().toISOString(),
      responseTimeMs: Math.round(performance.now() - started),
      lastError: error instanceof Error ? error.message : 'Probe failed'
    });
  }
}

export function startHealthMonitor(): void {
  if (timers.size) return;
  refreshHealthMonitor();
}

export function refreshHealthMonitor(): void {
  for (const timer of timers.values()) clearInterval(timer);
  timers.clear();
  const activeIds = new Set<string>();
  for (const app of loadRegistry().applications) {
    activeIds.add(app.id);
    void probe(app);
    if (app.health.type === 'http') {
      const seconds = app.health.intervalSeconds ?? getConfig().HEALTH_DEFAULT_INTERVAL_SECONDS;
      const timer = setInterval(() => void probe(app), seconds * 1000);
      timer.unref();
      timers.set(app.id, timer);
    }
  }
  for (const id of records.keys()) if (!activeIds.has(id)) records.delete(id);
}

export function publicHealth(id: string): HealthPublic {
  const record = records.get(id);
  return record
    ? {
        id,
        state: record.state,
        lastChecked: record.lastChecked,
        responseTimeMs: record.responseTimeMs
      }
    : { id, state: 'unknown', lastChecked: null, responseTimeMs: null };
}
