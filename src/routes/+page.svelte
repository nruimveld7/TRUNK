<script lang="ts">
  import type { PageData } from './$types';
  import AppCard from '$lib/components/AppCard.svelte';
  import { favoriteIds, preferences } from '$lib/stores/ui';
  import { groupApplications } from '$lib/utilities/applications';
  export let data: PageData;
  $: pinned = $favoriteIds
    .map((id) => data.applications.find((app) => app.id === id))
    .filter((app): app is NonNullable<typeof app> => Boolean(app));
  $: remaining = data.applications.filter((app) => !$favoriteIds.includes(app.id));
  $: groups = groupApplications(
    remaining,
    data.categories.map((category) => category.name)
  );
</script>

<div class="content">
  <header class="page-heading">
    <div>
      <p class="eyebrow">{data.siteName} application launcher</p>
      <h1>TRUNK</h1>
      <p>{data.siteDescription}</p>
    </div>
  </header>
  <section class="section first">
    <div class="section-header">
      <h2>Pinned</h2>
      <a href="/favorites">Manage favorites →</a>
    </div>
    {#if pinned.length}<div class="app-grid">
        {#each pinned as app (app.id)}<AppCard
            application={app}
            authenticated={Boolean(data.user)}
            csrfToken={data.csrfToken}
            launchBehavior={$preferences.launchBehavior}
          />{/each}
      </div>
    {:else}<div class="empty-state">
        Pin frequently used applications from the catalog for stable, quick access.
      </div>{/if}
  </section>
  <section class="section">
    <div class="section-header">
      <h2>Applications</h2>
      <a href="/applications">View all →</a>
    </div>
    {#if groups.length}
      {#each groups as group (group.category)}<div class="category">
          <h3>{group.category}</h3>
          <div class="app-grid">
            {#each group.apps.slice(0, 4) as app (app.id)}<AppCard
                application={app}
                authenticated={Boolean(data.user)}
                csrfToken={data.csrfToken}
                launchBehavior={$preferences.launchBehavior}
              />{/each}
          </div>
        </div>{/each}
    {:else}<div class="empty-state">
        No applications are available for your current access level.
      </div>{/if}
  </section>
</div>

<style>
  .first {
    margin-top: 0;
  }
  .category {
    margin-top: 1.4rem;
  }
  .category h3 {
    font-size: 0.84rem;
    margin: 0 0 0.65rem;
  }
</style>
