<script lang="ts">
  import type { PageData } from './$types';
  import type { AccessRole, ManagedUser, Visibility } from '$lib/types';
  import { invalidateAll } from '$app/navigation';

  type Application = PageData['registryApplications'][number];
  type DirectoryUser = { objectId: string; displayName: string; email: string | null };
  type Tab = 'site' | 'applications' | 'users';

  export let data: PageData;
  let tab: Tab = 'site';
  let message = '';
  let failure = false;
  let saving = false;
  let siteName = data.settings.siteName;
  let siteDescription = data.settings.siteDescription;
  let accentColor = data.settings.accentColor;
  let apps = data.registryApplications;
  let users = data.managedUsers;
  let editing: Application | null = null;
  let query = '';
  let directory: DirectoryUser[] = [];
  let searching = false;
  let selectedRole: AccessRole = 'User';
  let manualObjectId = '';
  let manualName = '';
  let manualEmail = '';

  const csrfHeaders = { 'content-type': 'application/json', 'x-csrf-token': data.csrfToken };

  function blankApplication(): Application {
    return {
      id: '',
      display: {
        name: '',
        description: '',
        category: 'General',
        icon: 'wrench',
        order: 100,
        new: false
      },
      route: { url: null },
      access: { visibility: 'guest' as Visibility },
      search: { tags: [] },
      health: { type: 'none' },
      demo: false
    };
  }

  function notice(text: string, isFailure = false) {
    message = text;
    failure = isFailure;
  }

  async function responseMessage(response: Response): Promise<string> {
    const body = await response.json().catch(() => null);
    return body?.message ?? `Request failed (${response.status})`;
  }

  async function saveSite() {
    saving = true;
    const response = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: csrfHeaders,
      body: JSON.stringify({ siteName, siteDescription, accentColor })
    });
    saving = false;
    if (!response.ok) return notice(await responseMessage(response), true);
    document.documentElement.style.setProperty('--accent', accentColor);
    notice('Site settings saved.');
    await invalidateAll();
  }

  async function saveApplication() {
    if (!editing) return;
    saving = true;
    const response = await fetch('/api/admin/applications', {
      method: 'POST',
      headers: csrfHeaders,
      body: JSON.stringify(editing)
    });
    saving = false;
    if (!response.ok) return notice(await responseMessage(response), true);
    apps = editing ? [...apps.filter((app) => app.id !== editing?.id), editing] : apps;
    editing = null;
    notice('Application saved.');
    await invalidateAll();
  }

  async function removeApplication(app: Application) {
    if (!confirm(`Remove ${app.display.name} from TRUNK?`)) return;
    const response = await fetch(`/api/admin/applications/${encodeURIComponent(app.id)}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': data.csrfToken }
    });
    if (!response.ok) return notice(await responseMessage(response), true);
    apps = apps.filter((item) => item.id !== app.id);
    notice('Application removed.');
    await invalidateAll();
  }

  async function searchDirectory() {
    searching = true;
    const response = await fetch(`/api/admin/directory?q=${encodeURIComponent(query)}`);
    searching = false;
    if (!response.ok) return notice(await responseMessage(response), true);
    directory = (await response.json()).users;
  }

  async function saveUser(user: DirectoryUser | ManagedUser, role = selectedRole) {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: csrfHeaders,
      body: JSON.stringify({
        objectId: user.objectId,
        displayName: user.displayName,
        email: user.email,
        role
      })
    });
    if (!response.ok) return notice(await responseMessage(response), true);
    users = [...users.filter((item) => item.objectId !== user.objectId), { ...user, role }].sort(
      (a, b) => a.displayName.localeCompare(b.displayName)
    );
    notice(`${user.displayName} saved as ${role}.`);
    await invalidateAll();
  }

  async function addManualUser() {
    await saveUser({
      objectId: manualObjectId.trim(),
      displayName: manualName.trim(),
      email: manualEmail.trim() || null
    });
    manualObjectId = '';
    manualName = '';
    manualEmail = '';
  }

  async function removeUser(user: ManagedUser) {
    if (!confirm(`Remove TRUNK access for ${user.displayName}?`)) return;
    const response = await fetch(`/api/admin/users/${encodeURIComponent(user.objectId)}`, {
      method: 'DELETE',
      headers: { 'x-csrf-token': data.csrfToken }
    });
    if (!response.ok) return notice(await responseMessage(response), true);
    users = users.filter((item) => item.objectId !== user.objectId);
    notice('User access removed.');
    await invalidateAll();
  }
</script>

<svelte:head><title>Administration — TRUNK</title></svelte:head>

<div class="content admin">
  <header class="page-heading">
    <div>
      <p class="eyebrow">Maintainer</p>
      <h1>Administration</h1>
      <p>Configure this deployment without editing files on the server.</p>
    </div>
  </header>

  <nav class="tabs" aria-label="Administration sections">
    <button class:active={tab === 'site'} on:click={() => (tab = 'site')}>Site</button>
    <button class:active={tab === 'applications'} on:click={() => (tab = 'applications')}
      >Applications</button
    >
    <button class:active={tab === 'users'} on:click={() => (tab = 'users')}>Users</button>
  </nav>
  {#if message}<div class:error={failure} class="notice" role="status">{message}</div>{/if}

  {#if tab === 'site'}
    <section class="panel narrow">
      <div class="panel-heading">
        <div>
          <h2>Site identity</h2>
          <p>TRUNK remains the product identity; these values identify this deployment.</p>
        </div>
      </div>
      <form on:submit|preventDefault={saveSite}>
        <label>Site name<input bind:value={siteName} maxlength="60" required /></label>
        <label
          >Site description<textarea bind:value={siteDescription} maxlength="160" rows="3" required
          ></textarea></label
        >
        <label
          >Accent color<span class="color-field"
            ><input type="color" bind:value={accentColor} /><input
              bind:value={accentColor}
              pattern="#[0-9A-Fa-f]{6}"
              required
            /></span
          ></label
        >
        <div class="actions">
          <button class="primary" disabled={saving}>{saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      </form>
    </section>
  {:else if tab === 'applications'}
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>Application catalog</h2>
          <p>Database changes override the seed YAML and survive container updates.</p>
        </div>
        <button class="primary" on:click={() => (editing = blankApplication())}
          >Add application</button
        >
      </div>
      <div class="rows">
        {#each apps as app (app.id)}
          <div class="row">
            <div>
              <strong>{app.display.name}</strong><span
                >{app.display.category} · {app.access.visibility}</span
              >
            </div>
            <code>{app.id}</code>
            <div class="row-actions">
              <button on:click={() => (editing = structuredClone(app))}>Edit</button><button
                class="danger"
                on:click={() => removeApplication(app)}>Remove</button
              >
            </div>
          </div>
        {/each}
      </div>
    </section>
    {#if editing}
      <section class="panel editor">
        <div class="panel-heading">
          <div>
            <h2>{editing.id ? 'Edit application' : 'New application'}</h2>
            <p>URLs may be absolute or an internal path beginning with /.</p>
          </div>
          <button on:click={() => (editing = null)}>Cancel</button>
        </div>
        <form on:submit|preventDefault={saveApplication}>
          <div class="form-grid">
            <label
              >Stable ID<input
                bind:value={editing.id}
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="drive-tools"
                required
              /></label
            >
            <label>Name<input bind:value={editing.display.name} required /></label>
            <label class="wide"
              >Description<textarea
                bind:value={editing.display.description}
                maxlength="180"
                rows="2"
                required
              ></textarea></label
            >
            <label>Category<input bind:value={editing.display.category} required /></label>
            <label
              >Icon<input bind:value={editing.display.icon} placeholder="wrench" required /></label
            >
            <label
              >Order<input
                type="number"
                min="0"
                step="1"
                bind:value={editing.display.order}
                required
              /></label
            >
            <label
              >Visibility<select bind:value={editing.access.visibility}
                ><option value="guest">Guest</option><option value="authenticated"
                  >Authenticated user</option
                ></select
              ></label
            >
            <label class="wide"
              >Destination URL<input
                value={editing.route.url ?? ''}
                on:input={(event) =>
                  editing && (editing.route.url = event.currentTarget.value || null)}
                placeholder="https://app.internal or /path"
              /></label
            >
            <label class="wide"
              >Search tags<input
                value={editing.search.tags.join(', ')}
                on:input={(event) =>
                  editing &&
                  (editing.search.tags = event.currentTarget.value
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter(Boolean))}
                placeholder="plc, diagnostics, line 1"
              /></label
            >
            <label
              >Health check<select
                value={editing.health.type}
                on:change={(event) =>
                  editing &&
                  (editing.health =
                    event.currentTarget.value === 'http'
                      ? {
                          type: 'http',
                          url: editing.route.url?.startsWith('http')
                            ? editing.route.url
                            : 'http://service/healthz',
                          expectedStatus: 200,
                          intervalSeconds: 30
                        }
                      : { type: 'none' })}
                ><option value="none">None</option><option value="http">HTTP</option></select
              ></label
            >
            {#if editing.health.type === 'http'}<label class="wide"
                >Health URL<input type="url" bind:value={editing.health.url} required /></label
              ><label
                >Expected status<input
                  type="number"
                  min="100"
                  max="599"
                  bind:value={editing.health.expectedStatus}
                /></label
              ><label
                >Interval seconds<input
                  type="number"
                  min="5"
                  bind:value={editing.health.intervalSeconds}
                /></label
              >{/if}
          </div>
          <div class="checks">
            <label
              ><input type="checkbox" bind:checked={editing.display.new} /> Show New badge</label
            ><label><input type="checkbox" bind:checked={editing.demo} /> Demo application</label>
          </div>
          <div class="actions">
            <button class="primary" disabled={saving}
              >{saving ? 'Saving…' : 'Save application'}</button
            >
          </div>
        </form>
      </section>
    {/if}
  {:else}
    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>TRUNK access</h2>
          <p>
            Roles control this launcher only. Each downstream application remains responsible for
            its own authorization.
          </p>
        </div>
      </div>
      <div class="directory-search">
        <input
          bind:value={query}
          on:keydown={(event) => event.key === 'Enter' && searchDirectory()}
          placeholder="Search Microsoft directory"
        /><button class="primary" disabled={searching} on:click={searchDirectory}
          >{searching ? 'Searching…' : 'Search'}</button
        ><select bind:value={selectedRole} aria-label="Role for new user"
          ><option>User</option><option>Maintainer</option></select
        >
      </div>
      {#if data.mockMode}
        <div class="manual">
          <p>Mock mode: enter a directory identity manually for local testing.</p>
          <input bind:value={manualObjectId} placeholder="Entra object ID" /><input
            bind:value={manualName}
            placeholder="Display name"
          /><input type="email" bind:value={manualEmail} placeholder="Email (optional)" /><button
            on:click={addManualUser}
            disabled={!manualObjectId.trim() || !manualName.trim()}>Add user</button
          >
        </div>
      {/if}
      {#if directory.length}<div class="search-results">
          {#each directory as person (person.objectId)}<div>
              <span
                ><strong>{person.displayName}</strong><small
                  >{person.email ?? 'No email address'}</small
                ></span
              ><button on:click={() => saveUser(person)}>Add as {selectedRole}</button>
            </div>{/each}
        </div>{/if}
      <div class="rows user-rows">
        {#each users as user (user.objectId)}
          <div class="row">
            <div><strong>{user.displayName}</strong><span>{user.email ?? user.objectId}</span></div>
            <select
              value={user.role}
              aria-label={`Role for ${user.displayName}`}
              on:change={(event) => saveUser(user, event.currentTarget.value as AccessRole)}
              ><option>User</option><option>Maintainer</option></select
            ><button class="danger" on:click={() => removeUser(user)}>Remove</button>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>

<style>
  .admin {
    max-width: 1100px;
  }
  .tabs {
    display: flex;
    gap: 0.3rem;
    border-bottom: 1px solid var(--border);
    margin-bottom: 1.25rem;
  }
  .tabs button {
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--muted);
    padding: 0.7rem 1rem;
    font-size: 0.78rem;
  }
  .tabs button.active {
    color: var(--accent);
    border-color: var(--accent);
    font-weight: 700;
  }
  .notice {
    padding: 0.7rem 0.85rem;
    margin-bottom: 1rem;
    border: 1px solid #86efac;
    background: #f0fdf4;
    color: #166534;
    border-radius: 7px;
    font-size: 0.76rem;
  }
  .notice.error {
    border-color: #fecaca;
    background: #fef2f2;
    color: #b91c1c;
  }
  .panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 9px;
    box-shadow: var(--shadow-sm);
    padding: 1.25rem;
    margin-bottom: 1rem;
  }
  .panel.narrow {
    max-width: 720px;
  }
  .panel-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.2rem;
  }
  h2 {
    font-size: 0.95rem;
    margin: 0;
  }
  .panel-heading p,
  .manual p {
    color: var(--muted);
    font-size: 0.7rem;
    line-height: 1.5;
    margin: 0.35rem 0 0;
  }
  form > label,
  .form-grid label {
    display: flex;
    flex-direction: column;
    gap: 0.38rem;
    color: var(--muted);
    font-size: 0.7rem;
    font-weight: 650;
    margin-bottom: 0.9rem;
  }
  input,
  textarea,
  select {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    padding: 0.58rem 0.65rem;
    font-size: 0.78rem;
  }
  textarea {
    resize: vertical;
  }
  .color-field {
    display: flex;
    gap: 0.5rem;
  }
  .color-field input[type='color'] {
    width: 48px;
    padding: 0.15rem;
  }
  button {
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    padding: 0.5rem 0.7rem;
    font-size: 0.72rem;
  }
  button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: white;
    font-weight: 700;
  }
  button.danger {
    color: #dc2626;
  }
  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 0.5rem;
  }
  .rows {
    border: 1px solid var(--border);
    border-radius: 7px;
    overflow: hidden;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.72rem 0.8rem;
    border-bottom: 1px solid var(--border);
  }
  .row:last-child {
    border-bottom: 0;
  }
  .row > div:first-child {
    min-width: 0;
    flex: 1;
  }
  .row strong,
  .row span {
    display: block;
  }
  .row strong {
    font-size: 0.78rem;
  }
  .row span {
    color: var(--muted);
    font-size: 0.67rem;
    margin-top: 0.16rem;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .row code {
    color: var(--muted);
    font-size: 0.68rem;
  }
  .row-actions {
    display: flex;
    flex: 0 0 auto !important;
    gap: 0.35rem;
  }
  .editor {
    margin-top: 1rem;
  }
  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 1rem;
  }
  .form-grid .wide {
    grid-column: 1 / -1;
  }
  .checks {
    display: flex;
    gap: 1.5rem;
  }
  .checks label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--muted);
    font-size: 0.72rem;
  }
  .checks input {
    width: auto;
  }
  .directory-search {
    display: grid;
    grid-template-columns: 1fr auto 130px;
    gap: 0.5rem;
    margin-bottom: 0.8rem;
  }
  .manual {
    display: grid;
    grid-template-columns: 1.1fr 1fr 1.2fr auto;
    gap: 0.5rem;
    padding: 0.8rem;
    margin-bottom: 1rem;
    background: var(--surface-muted);
    border-radius: 7px;
  }
  .manual p {
    grid-column: 1 / -1;
    margin: 0;
  }
  .search-results {
    border: 1px solid var(--border);
    border-radius: 7px;
    margin-bottom: 1rem;
    padding: 0.35rem;
  }
  .search-results > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.45rem;
  }
  .search-results span,
  .search-results small {
    display: block;
  }
  .search-results strong {
    font-size: 0.75rem;
  }
  .search-results small {
    color: var(--muted);
    font-size: 0.66rem;
    margin-top: 0.15rem;
  }
  .user-rows .row select {
    width: 130px;
  }
  @media (max-width: 700px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
    .form-grid .wide {
      grid-column: auto;
    }
    .row code {
      display: none;
    }
    .manual,
    .directory-search {
      grid-template-columns: 1fr;
    }
    .row {
      flex-wrap: wrap;
    }
  }
</style>
