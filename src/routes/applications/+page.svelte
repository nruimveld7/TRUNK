<script lang="ts">
  import type { PageData } from './$types';
  import AppCard from '$lib/components/AppCard.svelte';
  import { preferences } from '$lib/stores/ui';
  import { filterApplications, groupApplications } from '$lib/utilities/applications';
  export let data: PageData;
  let query = '';
  $: filtered = filterApplications(data.applications, query);
  $: groups = groupApplications(
    filtered,
    data.categories.map((category) => category.name)
  );
</script>

<div class="content">
  <header class="page-heading">
    <div>
      <p class="eyebrow">Catalog</p>
      <h1>Applications</h1>
      <p>Browse the complete, deterministically ordered {data.siteName} tool catalog.</p>
    </div>
    <input
      class="filter-input"
      bind:value={query}
      aria-label="Filter applications"
      placeholder="Filter applications..."
    />
  </header>
  {#if groups.length}{#each groups as group (group.category)}<section class="section">
        <div class="section-header">
          <h2>{group.category}</h2>
          <span>{group.apps.length}</span>
        </div>
        <div class="app-grid">
          {#each group.apps as app (app.id)}<AppCard
              application={app}
              authenticated={Boolean(data.user)}
              csrfToken={data.csrfToken}
              launchBehavior={$preferences.launchBehavior}
            />{/each}
        </div>
      </section>{/each}
  {:else}<div class="empty-state">
      No applications match “{query}”. Try a name, category, description, or equipment tag.
    </div>{/if}
</div>

<style>
  .section-header span {
    color: var(--muted);
    font-size: 0.68rem;
  }
</style>
