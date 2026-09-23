<script lang="ts">
  import { onMount } from 'svelte';
  import { Clock3, ExternalLink, LogIn, LogOut, Settings, Star } from 'lucide-svelte';
  import type { AccessRole, SessionUser } from '$lib/types';
  import { preferencesOpen } from '$lib/stores/ui';

  export let user: SessionUser | null;
  export let csrfToken: string;
  export let accessRole: AccessRole | null;

  let open = false;
  let root: HTMLDivElement;
  let signingOut = false;

  function resolveInitials(name: string | null, email: string | null, objectId: string | null) {
    const rawName = (name ?? '').trim();
    if (rawName) {
      const commaParts = rawName
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      const normalized = commaParts.length >= 2 ? `${commaParts[1]} ${commaParts[0]}` : rawName;
      const parts = normalized.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    }
    const fallback = (email ?? '').trim() || (objectId ?? '').trim();
    if (!fallback) return 'G';
    const parts = fallback
      .replace(/[@._-]+/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length <= 1) return (parts[0] ?? 'G').slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  $: initials = resolveInitials(
    user?.displayName ?? null,
    user?.email ?? null,
    user?.objectId ?? null
  );

  onMount(() => {
    const pointerDown = (event: PointerEvent) => {
      if (open && !root.contains(event.target as Node)) open = false;
    };
    const keyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') open = false;
    };
    window.addEventListener('pointerdown', pointerDown);
    window.addEventListener('keydown', keyDown);
    return () => {
      window.removeEventListener('pointerdown', pointerDown);
      window.removeEventListener('keydown', keyDown);
    };
  });

  async function signOut() {
    if (signingOut) return;
    signingOut = true;
    open = false;
    await fetch('/auth/logout', {
      method: 'POST',
      headers: { 'x-csrf-token': csrfToken }
    });
    location.assign('/');
  }
</script>

<div class="user-menu" bind:this={root}>
  <button
    type="button"
    class:user
    class="user-menu-trigger"
    aria-label={`Open user menu for ${user?.displayName ?? 'Guest'}`}
    title="Open user menu"
    aria-haspopup="menu"
    aria-expanded={open}
    on:click={() => (open = !open)}
  >
    {initials}
  </button>

  {#if open}
    <div class="user-menu-popover" role="menu" aria-label="User menu">
      <div class="identity">
        <span class:user class="identity-avatar">{initials}</span>
        <div>
          <strong>{user?.displayName ?? 'Guest'}</strong>
          <span>{user?.email ?? (user ? accessRole : 'Unauthenticated')}</span>
          {#if user}<small>{accessRole}</small>{/if}
        </div>
      </div>

      <button
        type="button"
        class="user-menu-item"
        role="menuitem"
        on:click={() => {
          preferencesOpen.set(true);
          open = false;
        }}><Settings size={15} />Preferences</button
      >

      {#if user}
        {#if accessRole === 'Maintainer'}
          <a class="user-menu-item" role="menuitem" href="/admin"
            ><Settings size={15} />Administration</a
          >
        {/if}
        <a class="user-menu-item" role="menuitem" href="/favorites"><Star size={15} />Favorites</a>
        <a class="user-menu-item" role="menuitem" href="/recent"
          ><Clock3 size={15} />Recent Applications</a
        >
        {#if !user.mock}
          <a
            class="user-menu-item"
            role="menuitem"
            href="https://myaccount.microsoft.com"
            target="_blank"
            rel="noreferrer">Microsoft Account<ExternalLink size={14} class="end" /></a
          >
        {/if}
        <div class="divider"></div>
        <button
          type="button"
          class="user-menu-item danger"
          role="menuitem"
          disabled={signingOut}
          on:click={signOut}><LogOut size={15} />{signingOut ? 'Signing out…' : 'Sign Out'}</button
        >
      {:else}
        <a class="user-menu-item signin" role="menuitem" href="/auth/login"
          ><LogIn size={15} />Sign in with Microsoft</a
        >
      {/if}
    </div>
  {/if}
</div>

<style>
  .user-menu {
    position: relative;
    justify-self: end;
  }
  .user-menu-trigger {
    appearance: none;
    width: 38px;
    height: 38px;
    padding: 0;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface-muted);
    color: var(--text);
    font-size: 13px;
    font-weight: 760;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .user-menu-trigger.user,
  .identity-avatar.user {
    background: color-mix(in srgb, var(--accent) 14%, var(--surface));
    border-color: color-mix(in srgb, var(--accent) 36%, var(--border));
    color: var(--accent-strong);
  }
  .user-menu-trigger:hover {
    background: var(--surface-muted);
    border-color: var(--border-strong);
  }
  .user-menu-popover {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 50;
    min-width: 250px;
    padding: 6px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--surface);
    box-shadow: 0 12px 28px #0003;
  }
  .identity {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.55rem 0.55rem 0.7rem;
    margin-bottom: 0.25rem;
  }
  .identity-avatar {
    width: 34px;
    height: 34px;
    flex: none;
    display: grid;
    place-items: center;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface-muted);
    font-size: 12px;
    font-weight: 760;
  }
  .identity strong,
  .identity span,
  .identity small {
    display: block;
  }
  .identity strong {
    font-size: 0.8rem;
  }
  .identity span {
    max-width: 175px;
    margin-top: 0.12rem;
    overflow: hidden;
    color: var(--muted);
    font-size: 0.68rem;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .identity small {
    margin-top: 0.22rem;
    color: var(--accent-strong);
    font-size: 0.63rem;
    font-weight: 700;
  }
  .user-menu-item {
    appearance: none;
    width: 100%;
    height: 34px;
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }
  .user-menu-item:hover:enabled,
  a.user-menu-item:hover {
    background: var(--surface-muted);
  }
  .user-menu-item:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
  .divider {
    height: 1px;
    margin: 4px 6px;
    background: var(--border);
  }
  .danger {
    color: #dc2626;
  }
  .signin {
    color: var(--accent-strong);
  }
  :global(.end) {
    margin-left: auto;
  }
</style>
