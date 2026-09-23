<script lang="ts">
  import { page } from '$app/stores';
  import { AppWindow, Clock3, Heart, House, Menu, Settings2, ServerCog, X } from 'lucide-svelte';
  import type { AccessRole } from '$lib/types';
  import { sidebarOpen } from '$lib/stores/ui';

  export let siteName: string;
  export let accessRole: AccessRole | null;

  const primary = [
    { href: '/', label: 'Home', icon: House },
    { href: '/applications', label: 'Applications', icon: AppWindow },
    { href: '/favorites', label: 'Favorites', icon: Heart },
    { href: '/recent', label: 'Recent', icon: Clock3 }
  ];
  const active = (href: string) =>
    href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(href);
</script>

<button class="mobile-trigger" aria-label="Open navigation" on:click={() => sidebarOpen.set(true)}
  ><Menu size={20} /></button
>
{#if $sidebarOpen}<button
    class="scrim"
    aria-label="Close navigation"
    on:click={() => sidebarOpen.set(false)}
  ></button>{/if}
<aside class:open={$sidebarOpen}>
  <div class="brand">
    <div class="mark" aria-hidden="true">T</div>
    <div><strong>TRUNK</strong><span>{siteName}</span></div>
    <button class="close" aria-label="Close navigation" on:click={() => sidebarOpen.set(false)}
      ><X size={19} /></button
    >
  </div>
  <nav aria-label="Primary navigation">
    {#each primary as item (item.href)}
      <a href={item.href} class:active={active(item.href)} on:click={() => sidebarOpen.set(false)}>
        <svelte:component this={item.icon} size={18} /><span>{item.label}</span>
      </a>
    {/each}
    <p class="section-label">System</p>
    <a href="/status" class:active={active('/status')} on:click={() => sidebarOpen.set(false)}
      ><ServerCog size={18} /><span>System Status</span></a
    >
    {#if accessRole === 'Maintainer'}
      <a href="/admin" class:active={active('/admin')} on:click={() => sidebarOpen.set(false)}
        ><Settings2 size={18} /><span>Administration</span></a
      >
    {/if}
  </nav>
  <div class="sidebar-foot"><span class="dot"></span><span>TRUNK platform</span></div>
</aside>

<style>
  aside {
    position: fixed;
    inset: 0 auto 0 0;
    width: var(--sidebar-width);
    background: #111827;
    color: #cbd5e1;
    z-index: 40;
    display: flex;
    flex-direction: column;
  }
  .brand {
    height: var(--topbar-height);
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 1.25rem;
    border-bottom: 1px solid #253044;
  }
  .mark {
    width: 32px;
    height: 32px;
    display: grid;
    place-items: center;
    background: var(--accent);
    color: white;
    font-weight: 800;
    border-radius: 7px;
  }
  .brand strong {
    display: block;
    color: white;
    font-size: 0.95rem;
    letter-spacing: 0.12em;
  }
  .brand span {
    display: block;
    color: #94a3b8;
    font-size: 0.72rem;
    margin-top: 0.12rem;
  }
  nav {
    padding: 1rem 0.75rem;
  }
  nav a {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.65rem 0.75rem;
    border-radius: 6px;
    color: #cbd5e1;
    text-decoration: none;
    font-size: 0.875rem;
    margin-bottom: 0.2rem;
  }
  nav a:hover {
    background: #1f2937;
    color: white;
  }
  nav a.active {
    background: #25334b;
    color: white;
    box-shadow: inset 3px 0 var(--accent);
  }
  .section-label {
    margin: 1.6rem 0.75rem 0.55rem;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 0.66rem;
    font-weight: 700;
  }
  .sidebar-foot {
    margin-top: auto;
    border-top: 1px solid #253044;
    padding: 1rem 1.25rem;
    font-size: 0.72rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #94a3b8;
  }
  .dot {
    width: 7px;
    height: 7px;
    background: #22c55e;
    border-radius: 50%;
  }
  .close,
  .mobile-trigger,
  .scrim {
    display: none;
  }
  @media (max-width: 800px) {
    aside {
      transform: translateX(-100%);
      transition: transform 0.18s ease;
      box-shadow: 10px 0 30px #0004;
    }
    aside.open {
      transform: translateX(0);
    }
    .close {
      display: grid;
      margin-left: auto;
      background: none;
      border: 0;
      color: #94a3b8;
      padding: 0.4rem;
    }
    .mobile-trigger {
      display: grid;
      place-items: center;
      position: fixed;
      left: 0.8rem;
      top: 0.8rem;
      width: 38px;
      height: 38px;
      z-index: 31;
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 7px;
    }
    .scrim {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 39;
      border: 0;
      background: #0f172a99;
    }
  }
</style>
