<script lang="ts">
  import type { PageData } from './$types';
  export let data: PageData;
</script>

<div class="content">
  <header class="page-heading">
    <div>
      <p class="eyebrow">System</p>
      <h1>Application Status</h1>
      <p>
        Sanitized server-side probe results. Downstream URLs and diagnostic errors remain private.
      </p>
    </div>
  </header>
  <div class="status-list">
    {#each data.applications as app (app.id)}<div class="status-row">
        <span class="indicator {app.health}"></span>
        <div><strong>{app.name}</strong><small>{app.category}</small></div>
        <span class="state">{app.health}</span>
      </div>{/each}
  </div>
  <p class="note">
    Unknown means no health probe is configured or the first probe has not completed. Application
    visibility is not authorization; each downstream application enforces access independently.
  </p>
</div>

<style>
  .status-list {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }
  .status-row {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 0.8rem 1rem;
    border-bottom: 1px solid var(--border);
  }
  .status-row:last-child {
    border: 0;
  }
  .indicator {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #94a3b8;
  }
  .indicator.online {
    background: #22c55e;
  }
  .indicator.degraded {
    background: #f59e0b;
  }
  .indicator.offline {
    background: #ef4444;
  }
  .status-row div {
    flex: 1;
  }
  .status-row strong,
  .status-row small {
    display: block;
  }
  .status-row strong {
    font-size: 0.8rem;
  }
  .status-row small {
    font-size: 0.66rem;
    color: var(--muted);
    margin-top: 0.15rem;
  }
  .state {
    color: var(--muted);
    font-size: 0.7rem;
    text-transform: capitalize;
  }
  .note {
    color: var(--muted);
    font-size: 0.7rem;
    line-height: 1.5;
    margin-top: 1rem;
  }
</style>
