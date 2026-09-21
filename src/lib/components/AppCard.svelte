<script lang="ts">
  import { ExternalLink, Heart, LockKeyhole } from 'lucide-svelte';
  import type { Preferences, PublicApplication } from '$lib/types';
  import AppIcon from './AppIcon.svelte';
  import { favoriteIds, recentIds, storeGuest } from '$lib/stores/ui';
  export let application: PublicApplication;
  export let authenticated: boolean;
  export let csrfToken: string;
  export let launchBehavior: Preferences['launchBehavior'];
  export let showFavorite = true;

  $: favorite = $favoriteIds.includes(application.id);

  async function toggleFavorite(event: MouseEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    const next = favorite
      ? $favoriteIds.filter((id) => id !== application.id)
      : [...$favoriteIds, application.id];
    favoriteIds.set(next);
    if (authenticated) {
      const response = await fetch('/api/favorites', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ ids: next })
      });
      if (!response.ok) favoriteIds.set($favoriteIds);
    } else storeGuest('trunk:favorites', next);
  }

  async function launch(event: MouseEvent): Promise<void> {
    if (!application.url) {
      event.preventDefault();
      return;
    }
    const nextRecent = [application.id, ...$recentIds.filter((id) => id !== application.id)].slice(
      0,
      30
    );
    recentIds.set(nextRecent);
    if (authenticated)
      await fetch('/api/launch', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify({ id: application.id })
      });
    else storeGuest('trunk:recent', nextRecent);
  }
</script>

<article class="card" class:disabled={!application.url} data-testid="app-card">
  <a
    href={application.url ?? '#'}
    target={launchBehavior === 'new' ? '_blank' : undefined}
    rel={launchBehavior === 'new' ? 'noreferrer' : undefined}
    on:click={launch}
    aria-disabled={!application.url}
  >
    <div class="card-top">
      <span class="icon"><AppIcon name={application.icon} /></span>
      <span class="badges"
        >{#if application.isNew}<span class="new">New</span
          >{/if}{#if application.visibility === 'authenticated'}<LockKeyhole
            size={13}
            aria-label="Sign-in required"
          />{/if}{#if application.external}<ExternalLink
            size={14}
            aria-label="Leaves TRUNK"
          />{/if}</span
      >
    </div>
    <h3>{application.name}</h3>
    <p>{application.description}</p>
    <footer>
      <span>{application.category}</span><span class="status {application.health}"
        ><i></i>{application.health}</span
      >
    </footer>
    {#if application.demo && !application.url}<span class="demo"
        >Demo entry · not yet configured</span
      >{/if}
  </a>
  {#if showFavorite}<button
      class="favorite"
      class:selected={favorite}
      aria-label={favorite
        ? `Remove ${application.name} from favorites`
        : `Add ${application.name} to favorites`}
      on:click={toggleFavorite}
      ><Heart size={16} fill={favorite ? 'currentColor' : 'none'} /></button
    >{/if}
</article>

<style>
  .card {
    position: relative;
    min-width: 0;
    height: 158px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: var(--shadow-sm);
    transition:
      border-color 0.15s,
      box-shadow 0.15s,
      transform 0.15s;
  }
  .card:hover {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-md);
    transform: translateY(-1px);
  }
  .card > a {
    display: flex;
    flex-direction: column;
    height: 100%;
    box-sizing: border-box;
    padding: 1rem;
    color: inherit;
    text-decoration: none;
    border-radius: inherit;
  }
  .card.disabled > a {
    cursor: default;
  }
  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .icon {
    width: 35px;
    height: 35px;
    display: grid;
    place-items: center;
    color: var(--accent);
    background: var(--accent-soft);
    border-radius: 7px;
  }
  .badges {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--muted);
    padding-right: 1.8rem;
  }
  .new {
    color: #1d4ed8;
    background: #dbeafe;
    padding: 0.14rem 0.35rem;
    border-radius: 3px;
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 800;
  }
  h3 {
    font-size: 0.91rem;
    margin: 0.7rem 0 0.25rem;
    line-height: 1.2;
  }
  p {
    color: var(--muted);
    font-size: 0.73rem;
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    line-clamp: 2;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    font-size: 0.64rem;
    color: var(--muted);
  }
  .status {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    text-transform: capitalize;
  }
  .status i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #94a3b8;
  }
  .status.online i {
    background: #22c55e;
  }
  .status.degraded i {
    background: #f59e0b;
  }
  .status.offline i {
    background: #ef4444;
  }
  .favorite {
    position: absolute;
    right: 0.55rem;
    top: 0.55rem;
    z-index: 2;
    border: 0;
    background: transparent;
    color: var(--muted);
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 5px;
  }
  .favorite:hover {
    background: var(--surface-muted);
    color: var(--accent);
  }
  .favorite.selected {
    color: var(--accent);
  }
  .demo {
    position: absolute;
    right: 0.7rem;
    bottom: 0.65rem;
    background: var(--surface-muted);
    color: var(--muted);
    font-size: 0.57rem;
    padding: 0.16rem 0.3rem;
    border-radius: 3px;
  }
</style>
