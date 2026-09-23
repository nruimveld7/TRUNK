<script lang="ts">
  import { Search } from 'lucide-svelte';
  import type { AccessRole, SessionUser } from '$lib/types';
  import { paletteOpen } from '$lib/stores/ui';
  import AccountMenu from './AccountMenu.svelte';
  export let user: SessionUser | null;
  export let csrfToken: string;
  export let accessRole: AccessRole | null;
</script>

<header class="topbar">
  <button class="search" on:click={() => paletteOpen.set(true)}
    ><Search size={17} /><span>Search tools, apps, equipment...</span><kbd>Ctrl K</kbd></button
  ><AccountMenu {user} {csrfToken} {accessRole} />
</header>

<style>
  .topbar {
    position: fixed;
    top: 0;
    left: var(--sidebar-width);
    right: 0;
    height: var(--topbar-height);
    z-index: 30;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0 1.5rem;
    background: color-mix(in srgb, var(--surface) 95%, transparent);
    border-bottom: 1px solid var(--border);
    backdrop-filter: blur(10px);
  }
  .search {
    width: min(520px, 50vw);
    height: 38px;
    display: flex;
    align-items: center;
    gap: 0.65rem;
    background: var(--surface-muted);
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 7px;
    padding: 0 0.75rem;
    text-align: left;
  }
  .search span {
    flex: 1;
    font-size: 0.78rem;
  }
  kbd {
    border: 1px solid var(--border);
    background: var(--surface);
    border-radius: 4px;
    padding: 0.15rem 0.35rem;
    font: inherit;
    font-size: 0.62rem;
  }
  @media (max-width: 800px) {
    .topbar {
      left: 0;
      padding-left: 3.7rem;
    }
    .search {
      width: min(420px, 55vw);
    }
  }
  @media (max-width: 600px) {
    .topbar {
      padding-right: 0.7rem;
    }
    .search span {
      display: none;
    }
    .search {
      width: 86px;
    }
    kbd {
      display: none;
    }
  }
</style>
