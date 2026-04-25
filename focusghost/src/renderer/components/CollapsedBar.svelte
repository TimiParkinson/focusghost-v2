<script lang="ts">
  import { Maximize2, Eye, EyeOff } from 'lucide-svelte';
  import { settings, stats } from '../stores';
  import { AppCategory } from '../../shared/types';
  import Ghost from './Ghost.svelte';

  function fmt(ms: number): string {
    const totalSec = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  let drifting = $derived($stats?.currentAppCategory === AppCategory.DISTRACTION);
  let remaining = $derived($stats?.remainingMs ?? 0);
  let task = $derived($stats?.taskName || 'No active session');

  async function cycleOpacity(): Promise<void> {
    const cur = $settings.opacity;
    const next = cur > 0.85 ? 0.75 : cur > 0.6 ? 0.45 : 1;
    await window.api.updateSettings({ opacity: next });
    await window.api.setOpacity(next);
  }
</script>

<div
  class="drag h-full w-full flex items-center justify-between px-3"
  data-testid="collapsed-bar"
  style="background: linear-gradient(180deg, rgba(16,23,29,0.92) 0%, rgba(11,16,20,0.92) 100%); border-radius: 10px; border: 1px solid var(--border);"
>
  <div class="flex items-center gap-2 no-drag">
    <Ghost size={28} drifting={drifting} />
    <span class="text-xs truncate max-w-[160px]" data-testid="bar-task">{task}</span>
    <span class="text-xs accent-text font-semibold tabular-nums" data-testid="bar-timer">
      {fmt(remaining)}
    </span>
  </div>
  <div class="flex items-center gap-2 no-drag">
    <span class="dot" style="background: {drifting ? '#FF6B7A' : '#22c55e'}"></span>
    <span class="text-[10px] uppercase tracking-wider text-white/50 truncate max-w-[110px]">
      {$stats?.currentApp ?? '—'}
    </span>
    <button class="btn-ghost btn !p-1" onclick={cycleOpacity} title="Opacity">
      {#if $settings.opacity < 0.7}<EyeOff size={12} />{:else}<Eye size={12} />{/if}
    </button>
    <button
      class="btn-ghost btn !p-1"
      onclick={() => window.api.toggleCollapsed()}
      title="Expand"
      data-testid="btn-expand"
    >
      <Maximize2 size={12} />
    </button>
  </div>
</div>
