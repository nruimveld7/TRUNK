<script lang="ts">
  import {
    BookOpen,
    Cpu,
    DatabaseBackup,
    EthernetPort,
    Gauge,
    Monitor,
    Network,
    RotateCw,
    Thermometer,
    Workflow,
    Wrench
  } from 'lucide-svelte';
  export let name: string;
  const icons = {
    'book-open': BookOpen,
    cpu: Cpu,
    'database-backup': DatabaseBackup,
    'ethernet-port': EthernetPort,
    gauge: Gauge,
    monitor: Monitor,
    network: Network,
    'rotate-cw': RotateCw,
    thermometer: Thermometer,
    workflow: Workflow
  };
  $: Icon = icons[name as keyof typeof icons] ?? Wrench;
</script>

<svelte:component this={Icon} size={22} strokeWidth={1.8} aria-hidden="true" />
