<script lang="ts">
  import type { PageData } from './$types';
  import AppCard from '$lib/components/AppCard.svelte';
  import { favoriteIds, preferences } from '$lib/stores/ui';
  export let data: PageData;
  $: apps = $favoriteIds
    .map((id) => data.applications.find((app) => app.id === id))
    .filter((app): app is NonNullable<typeof app> => Boolean(app));
</script>

<div class="content">
  <header class="page-heading">
    <div>
      <p class="eyebrow">Personal workspace</p>
      <h1>Favorites</h1>
      <p>Your explicitly ordered shortcuts. Remove a favorite with its heart control.</p>
    </div>
  </header>
  {#if apps.length}<div class="app-grid">
      {#each apps as app (app.id)}<AppCard
          application={app}
          authenticated={Boolean(data.user)}
          csrfToken={data.csrfToken}
          launchBehavior={$preferences.launchBehavior}
        />{/each}
    </div>{:else}<div class="empty-state">
      No favorites yet. <a class="text-link" href="/applications">Browse applications</a> and select a
      heart to pin one.
    </div>{/if}
</div>
