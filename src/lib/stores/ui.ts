import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import type { Preferences } from '$lib/types';

export const sidebarOpen = writable(false);
export const paletteOpen = writable(false);
export const preferencesOpen = writable(false);
export const favoriteIds = writable<string[]>([]);
export const recentIds = writable<string[]>([]);
export const preferences = writable<Preferences>({
  appearance: 'system',
  launchBehavior: 'same',
  density: 'comfortable'
});

export function initializeUi(
  authenticated: boolean,
  serverFavorites: string[],
  serverRecent: string[],
  serverPreferences: Preferences
): void {
  if (!browser) return;
  favoriteIds.set(authenticated ? serverFavorites : read<string[]>('trunk:favorites', []));
  recentIds.set(authenticated ? serverRecent : read<string[]>('trunk:recent', []));
  preferences.set(
    authenticated ? serverPreferences : read<Preferences>('trunk:preferences', serverPreferences)
  );
}

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function storeGuest<T>(key: string, value: T): void {
  if (browser) localStorage.setItem(key, JSON.stringify(value));
}

export function applyAppearance(value: Preferences['appearance']): void {
  if (!browser) return;
  const dark =
    value === 'dark' || (value === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
