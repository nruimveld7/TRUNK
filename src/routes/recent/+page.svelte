<script lang="ts">
  import type { PageData } from './$types';
  import AppCard from '$lib/components/AppCard.svelte';
  import { recentIds, preferences } from '$lib/stores/ui';
  export let data: PageData;
  $: apps = $recentIds
    .map((id) => data.applications.find((app) => app.id === id))
    .filter((app): app is NonNullable<typeof app> => Boolean(app));
</script>

<div class="content">
  <header class="page-heading">
    <div>
      <p class="eyebrow">Launch history</p>
      <h1>Recent</h1>
      <p>Applications are ordered by the most recent launch; catalog order remains unchanged.</p>
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
      No applications have been launched from this profile yet.
    </div>{/if}
</div>
