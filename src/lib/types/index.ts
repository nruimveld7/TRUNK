export type Visibility = 'guest' | 'authenticated';
export type HealthState = 'online' | 'degraded' | 'offline' | 'unknown';
export type Appearance = 'system' | 'light' | 'dark';
export type LaunchBehavior = 'same' | 'new';
export type Density = 'comfortable' | 'compact';
export type AccessRole = 'User' | 'Maintainer';

export interface SessionUser {
  subject: string;
  tenantId: string;
  objectId: string;
  displayName: string;
  email?: string;
  department?: string;
  mock?: boolean;
}

export interface PublicApplication {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  order: number;
  isNew: boolean;
  url: string | null;
  external: boolean;
  demo: boolean;
  visibility: Visibility;
  tags: string[];
  health: HealthState;
}

export interface Preferences {
  appearance: Appearance;
  launchBehavior: LaunchBehavior;
  density: Density;
}

export interface HealthPublic {
  id: string;
  state: HealthState;
  lastChecked: string | null;
  responseTimeMs: number | null;
}

export interface ManagedUser {
  objectId: string;
  displayName: string;
  email: string | null;
  role: AccessRole;
}
