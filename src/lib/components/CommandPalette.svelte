<script lang="ts">
  import { tick } from 'svelte';
  import { ArrowRight, Search, X } from 'lucide-svelte';
  import type { PublicApplication } from '$lib/types';
  import { filterApplications } from '$lib/utilities/applications';
  import { paletteOpen } from '$lib/stores/ui';
  export let applications: PublicApplication[];
  let query = '';
  let active = 0;
  let input: HTMLInputElement;
  $: results = filterApplications(applications, query).slice(0, 8);
  $: if ($paletteOpen) {
    query = '';
    active = 0;
    tick().then(() => input?.focus());
  }

  function keydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') paletteOpen.set(false);
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      active = Math.min(active + 1, results.length - 1);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      active = Math.max(active - 1, 0);
    }
    if (event.key === 'Enter' && results[active]?.url) location.assign(results[active].url!);
  }
</script>

{#if $paletteOpen}
  <div
    class="backdrop"
    role="presentation"
    on:mousedown={(event) => event.currentTarget === event.target && paletteOpen.set(false)}
  >
    <dialog
      open
      class="palette"
      aria-modal="true"
      aria-label="Search applications"
      on:keydown={keydown}
    >
      <div class="search">
        <Search size={20} /><input
          bind:this={input}
          bind:value={query}
          placeholder="Search tools, apps, equipment..."
          aria-label="Search applications"
          on:input={() => (active = 0)}
        /><button aria-label="Close search" on:click={() => paletteOpen.set(false)}
          ><X size={18} /></button
        >
      </div>
      <div class="results" role="listbox">
        {#if results.length}
          {#each results as app, index (app.id)}
            <a
              class:active={index === active}
              aria-selected={index === active}
              role="option"
              href={app.url ?? undefined}
              aria-disabled={!app.url}
              on:mouseenter={() => (active = index)}
              on:click={() => paletteOpen.set(false)}
            >
              <span
                ><strong>{app.name}</strong><small>{app.category} · {app.description}</small></span
              ><ArrowRight size={16} />
            </a>
          {/each}
        {:else}<div class="empty">No applications match “{query}”.</div>{/if}
      </div>
      <footer>
        <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span
          ><kbd>Esc</kbd> Close</span
        >
      </footer>
    </dialog>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: #0f172a99;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: min(18vh, 150px);
  }
  .palette {
    position: relative;
    margin: 0;
    width: min(620px, calc(100vw - 2rem));
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--border);
    box-shadow: 0 24px 70px #0005;
    border-radius: 11px;
    overflow: hidden;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--border);
    color: var(--muted);
  }
  input {
    flex: 1;
    border: 0;
    outline: 0;
    font: inherit;
    font-size: 0.95rem;
    background: transparent;
    color: var(--text);
  }
  .search button {
    border: 0;
    background: none;
    color: var(--muted);
    display: grid;
  }
  .results {
    padding: 0.45rem;
    max-height: 390px;
    overflow: auto;
  }
  .results a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 0.8rem;
    color: var(--text);
    text-decoration: none;
    border-radius: 6px;
  }
  .results a.active {
    background: var(--accent-soft);
    color: var(--accent-strong);
  }
  .results a[aria-disabled='true'] {
    opacity: 0.65;
    pointer-events: none;
  }
  .results strong,
  .results small {
    display: block;
  }
  .results strong {
    font-size: 0.85rem;
  }
  .results small {
    margin-top: 0.2rem;
    color: var(--muted);
    font-size: 0.7rem;
  }
  .empty {
    padding: 2.5rem;
    text-align: center;
    color: var(--muted);
    font-size: 0.84rem;
  }
  footer {
    border-top: 1px solid var(--border);
    padding: 0.55rem 1rem;
    color: var(--muted);
    font-size: 0.65rem;
    display: flex;
    gap: 1.2rem;
  }
  kbd {
    border: 1px solid var(--border);
    border-bottom-width: 2px;
    border-radius: 3px;
    padding: 0.08rem 0.28rem;
    font-family: inherit;
    margin-right: 0.15rem;
    background: var(--surface-muted);
  }
</style>
