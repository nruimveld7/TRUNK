<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="content">
  <div class="error">
    <p class="eyebrow">Request could not be completed</p>
    <h1>{$page.status}</h1>
    <p>{$page.error?.message ?? 'An unexpected error occurred.'}</p>
    <a href="/">Return to TRUNK</a>
  </div>
</div>

<style>
  .error {
    max-width: 520px;
    margin: 10vh auto;
    padding: 2rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 9px;
    text-align: center;
  }
  .error h1 {
    font-size: 2.5rem;
    margin: 0.4rem;
  }
  .error p {
    color: var(--muted);
    font-size: 0.8rem;
  }
  .error a {
    display: inline-block;
    margin-top: 1rem;
    color: var(--accent);
    font-size: 0.8rem;
  }
</style>
