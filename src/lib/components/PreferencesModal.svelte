<script lang="ts">
  import { X } from 'lucide-svelte';
  import type { Preferences } from '$lib/types';
  import { applyAppearance, preferences, preferencesOpen, storeGuest } from '$lib/stores/ui';
  export let authenticated: boolean;
  export let csrfToken: string;
  let saving = false;
  let message = '';

  async function save(): Promise<void> {
    saving = true;
    message = '';
    const value: Preferences = $preferences;
    applyAppearance(value.appearance);
    if (authenticated) {
      const response = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
        body: JSON.stringify(value)
      });
      message = response.ok ? 'Saved' : 'Could not save';
    } else {
      storeGuest('trunk:preferences', value);
      message = 'Saved on this browser';
    }
    saving = false;
  }
</script>

{#if $preferencesOpen}
  <div
    class="backdrop"
    role="presentation"
    on:mousedown={(event) => event.target === event.currentTarget && preferencesOpen.set(false)}
  >
    <dialog open aria-labelledby="preferences-title">
      <header>
        <div>
          <h2 id="preferences-title">Preferences</h2>
          <p>
            {authenticated
              ? 'Synced to your TRUNK profile.'
              : 'Stored in this browser for guest access.'}
          </p>
        </div>
        <button aria-label="Close preferences" on:click={() => preferencesOpen.set(false)}
          ><X size={19} /></button
        >
      </header>
      <div class="field">
        <span>Appearance</span>
        <div class="choices">
          {#each ['system', 'light', 'dark'] as option (option)}<label
              ><input
                type="radio"
                name="appearance"
                value={option}
                bind:group={$preferences.appearance}
              /><span>{option[0].toUpperCase() + option.slice(1)}</span></label
            >{/each}
        </div>
      </div>
      <div class="field">
        <span>Application launch behavior</span>
        <div class="choices">
          {#each [{ value: 'same', label: 'Same tab' }, { value: 'new', label: 'New tab' }] as option (option.value)}<label
              ><input
                type="radio"
                name="launch"
                value={option.value}
                bind:group={$preferences.launchBehavior}
              /><span>{option.label}</span></label
            >{/each}
        </div>
      </div>
      <div class="field">
        <span>Density</span>
        <div class="choices">
          {#each ['comfortable', 'compact'] as option (option)}<label
              ><input
                type="radio"
                name="density"
                value={option}
                bind:group={$preferences.density}
              /><span>{option[0].toUpperCase() + option.slice(1)}</span></label
            >{/each}
        </div>
      </div>
      <footer>
        <span>{message}</span><button class="secondary" on:click={() => preferencesOpen.set(false)}
          >Cancel</button
        ><button class="primary" disabled={saving} on:click={save}
          >{saving ? 'Saving…' : 'Save preferences'}</button
        >
      </footer>
    </dialog>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: #0f172a99;
    display: grid;
    place-items: center;
    padding: 1rem;
  }
  dialog {
    position: relative;
    margin: 0;
    color: var(--text);
    width: min(540px, 100%);
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    box-shadow: var(--shadow-lg);
  }
  header {
    display: flex;
    justify-content: space-between;
    padding: 1.1rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }
  h2 {
    margin: 0;
    font-size: 1rem;
  }
  header p {
    margin: 0.25rem 0 0;
    color: var(--muted);
    font-size: 0.72rem;
  }
  header button {
    border: 0;
    background: none;
    color: var(--muted);
  }
  .field {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
  }
  .field > span {
    display: block;
    font-size: 0.76rem;
    font-weight: 650;
    margin-bottom: 0.65rem;
  }
  .choices {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  label input {
    position: absolute;
    opacity: 0;
  }
  label span {
    display: block;
    border: 1px solid var(--border);
    padding: 0.45rem 0.7rem;
    border-radius: 5px;
    font-size: 0.73rem;
    cursor: pointer;
  }
  label input:checked + span {
    border-color: var(--accent);
    color: var(--accent);
    background: var(--accent-soft);
  }
  footer {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.85rem 1.25rem;
  }
  footer > span {
    margin-right: auto;
    color: var(--muted);
    font-size: 0.7rem;
  }
  footer button {
    border-radius: 5px;
    padding: 0.48rem 0.72rem;
    font: inherit;
    font-size: 0.73rem;
  }
  .secondary {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
  }
  .primary {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: white;
  }
</style>
