<script lang="ts">
  import '../styles.css';
  import { onMount } from 'svelte';
  import type { LayoutData } from './$types';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Topbar from '$lib/components/Topbar.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import PreferencesModal from '$lib/components/PreferencesModal.svelte';
  import { applyAppearance, initializeUi, paletteOpen, preferences } from '$lib/stores/ui';
  export let data: LayoutData;
  $: authenticated = Boolean(data.user);

  onMount(() => {
    document.documentElement.style.setProperty('--accent', data.accentColor);
    document.documentElement.style.setProperty('--accent-strong', data.accentColor);
    initializeUi(authenticated, data.favoriteIds, data.recentIds, data.preferences);
    applyAppearance(data.preferences.appearance);
    const unsubscribe = preferences.subscribe((value) => applyAppearance(value.appearance));
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        paletteOpen.set(true);
      }
    };
    window.addEventListener('keydown', keyboard);
    return () => {
      unsubscribe();
      window.removeEventListener('keydown', keyboard);
    };
  });
</script>

<svelte:head
  ><title>TRUNK — {data.siteName}</title><meta
    name="description"
    content={data.siteDescription}
  /></svelte:head
>
<Sidebar siteName={data.siteName} accessRole={data.accessRole} />
<Topbar user={data.user} csrfToken={data.csrfToken} accessRole={data.accessRole} />
<main class:compact={$preferences.density === 'compact'}>
  {#if data.mockMode}<div class="mock-banner" role="status">
      Development authentication mode — identities and access are simulated
    </div>{/if}
  <slot />
</main>
<CommandPalette applications={data.applications} />
<PreferencesModal {authenticated} csrfToken={data.csrfToken} />
