<script lang="ts">
  import { ChevronDown, ExternalLink, LogIn, LogOut, Settings, Star, Clock3 } from 'lucide-svelte';
  import type { SessionUser } from '$lib/types';
  import { preferencesOpen } from '$lib/stores/ui';
  export let user: SessionUser | null;
  export let csrfToken: string;
  let open = false;
  $: initials =
    user?.displayName
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() ?? '';
</script>

<div class="account">
  <button
    class="account-button"
    aria-haspopup="menu"
    aria-expanded={open}
    on:click={() => (open = !open)}
  >
    <span class:user-avatar={user} class:guest-avatar={!user}>{user ? initials : '○'}</span>
    <span class="account-copy"
      ><strong>{user?.displayName ?? 'Guest'}</strong><small
        >{user?.department ?? 'Limited access'}</small
      ></span
    >
    <ChevronDown size={15} />
  </button>
  {#if open}
    <button class="dismiss" aria-label="Close account menu" on:click={() => (open = false)}
    ></button>
    <div class="popover" role="menu">
      <div class="identity">
        <span class:user-avatar={user} class:guest-avatar={!user}>{user ? initials : '○'}</span>
        <div>
          <strong>{user?.displayName ?? 'Guest'}</strong><span
            >{user?.email ?? 'Limited access'}</span
          >
        </div>
      </div>
      {#if user?.mock}<div class="mock-label">Development mock identity</div>{/if}
      <button
        role="menuitem"
        on:click={() => {
          preferencesOpen.set(true);
          open = false;
        }}><Settings size={16} />Preferences</button
      >
      {#if user}
        <a role="menuitem" href="/favorites"><Star size={16} />Manage Favorites</a>
        <a role="menuitem" href="/recent"><Clock3 size={16} />Recent Applications</a>
        {#if !user.mock}<a
            role="menuitem"
            href="https://myaccount.microsoft.com"
            target="_blank"
            rel="noreferrer">Microsoft Account<ExternalLink size={15} class="end" /></a
          >{/if}
        <form method="post" action="/auth/logout">
          <input type="hidden" name="csrf" value={csrfToken} /><button
            role="menuitem"
            class="danger"
            on:click={(event) => {
              event.preventDefault();
              fetch('/auth/logout', {
                method: 'POST',
                headers: { 'x-csrf-token': csrfToken }
              }).then(() => location.assign('/'));
            }}><LogOut size={16} />Sign Out</button
          >
        </form>
      {:else}
        <a role="menuitem" href="/auth/login" class="signin"
          ><LogIn size={16} />Sign in with Microsoft</a
        >
      {/if}
    </div>
  {/if}
</div>

<style>
  .account {
    position: relative;
  }
  .account-button {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text);
    border-radius: 7px;
    padding: 0.35rem 0.45rem;
    min-width: 150px;
    text-align: left;
  }
  .account-button:hover {
    background: var(--surface-muted);
    border-color: var(--border);
  }
  .account-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
    flex: 1;
  }
  .account-copy strong {
    font-size: 0.8rem;
    max-width: 110px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .account-copy small {
    color: var(--muted);
    font-size: 0.68rem;
    margin-top: 0.1rem;
  }
  .user-avatar,
  .guest-avatar {
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    font-size: 0.68rem;
    font-weight: 700;
    flex: none;
  }
  .user-avatar {
    background: #dbeafe;
    color: #1d4ed8;
  }
  .guest-avatar {
    background: var(--surface-muted);
    color: var(--muted);
    border: 1px solid var(--border);
  }
  .dismiss {
    position: fixed;
    inset: 0;
    border: 0;
    background: transparent;
    z-index: 49;
  }
  .popover {
    position: absolute;
    right: 0;
    top: calc(100% + 0.55rem);
    z-index: 50;
    width: 270px;
    background: var(--surface);
    border: 1px solid var(--border);
    box-shadow: var(--shadow-lg);
    border-radius: 9px;
    padding: 0.4rem;
  }
  .identity {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.65rem 0.6rem 0.8rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 0.35rem;
  }
  .identity strong,
  .identity span {
    display: block;
  }
  .identity strong {
    font-size: 0.84rem;
  }
  .identity span {
    color: var(--muted);
    font-size: 0.72rem;
    margin-top: 0.15rem;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 185px;
  }
  .popover button,
  .popover a {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.58rem 0.65rem;
    border: 0;
    background: transparent;
    color: var(--text);
    text-decoration: none;
    font: inherit;
    font-size: 0.79rem;
    border-radius: 5px;
    text-align: left;
  }
  .popover button:hover,
  .popover a:hover {
    background: var(--surface-muted);
  }
  .popover form {
    border-top: 1px solid var(--border);
    margin-top: 0.35rem;
    padding-top: 0.35rem;
  }
  .danger {
    color: #dc2626 !important;
  }
  .signin {
    color: var(--accent) !important;
    font-weight: 600 !important;
    border-top: 1px solid var(--border);
    margin-top: 0.35rem;
  }
  .mock-label {
    margin: 0.15rem 0.6rem 0.4rem;
    padding: 0.28rem 0.4rem;
    color: #92400e;
    background: #fef3c7;
    border-radius: 4px;
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    font-weight: 700;
  }
  :global(.end) {
    margin-left: auto;
  }
  @media (max-width: 600px) {
    .account-copy {
      display: none;
    }
    .account-button {
      min-width: auto;
    }
  }
</style>
