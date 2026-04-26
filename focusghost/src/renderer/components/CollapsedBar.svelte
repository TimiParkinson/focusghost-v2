<script lang="ts">
  import { ChevronUp, Eye, EyeOff } from 'lucide-svelte';
  import { settings, stats } from '../stores';
  import { AppCategory } from '../../shared/types';
  import Ghost from './Ghost.svelte';

  const isMacElectron =
    typeof navigator !== 'undefined' &&
    navigator.platform.toLowerCase().includes('mac') &&
    navigator.userAgent.includes('Electron');

  function fmt(ms: number): string {
    const totalSec = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  let drifting = $derived($stats?.currentAppCategory === AppCategory.DISTRACTION);
  let remaining = $derived($stats?.remainingMs ?? 0);
  let task = $derived($stats?.taskName || 'No active session');
  let appName = $derived($stats?.currentApp || 'Waiting');

  async function cycleOpacity(): Promise<void> {
    const cur = $settings.opacity;
    const next = cur > 0.85 ? 0.75 : cur > 0.6 ? 0.45 : 1;
    await window.api.updateSettings({ opacity: next });
    await window.api.setOpacity(next);
  }
</script>

<div
  class:drifting
  class:native-chrome={isMacElectron}
  class="collapsed-bar drag h-full w-full"
  data-testid="collapsed-bar"
>
  <div class="bar-section brand">
    <Ghost size={30} drifting={drifting} />
    <div class="label-stack no-drag">
      <div class="task" data-testid="bar-task">{task}</div>
      <div class="state">{drifting ? 'Drifting' : 'Focused'}</div>
    </div>
  </div>

  <div class="bar-divider"></div>

  <div class="bar-section metric no-drag">
    <span class="metric-label">Timer</span>
    <span class="metric-value accent-text" data-testid="bar-timer">{fmt(remaining)}</span>
  </div>

  <div class="bar-divider"></div>

  <div class="bar-section metric no-drag current-app">
    <span class="metric-label">App</span>
    <span class="metric-value truncate">{appName}</span>
  </div>

  <div class="bar-spacer"></div>

  <div class="bar-actions no-drag">
    <button
      class="icon-btn opacity-btn"
      onclick={cycleOpacity}
      title="Cycle opacity"
      data-testid="btn-bar-opacity"
    >
      {#if $settings.opacity < 0.7}
        <EyeOff size={14} />
      {:else}
        <Eye size={14} />
      {/if}
    </button>
    <button
      class="icon-btn"
      onclick={() => window.api.expand()}
      title="Expand panel"
      data-testid="btn-expand"
    >
      <ChevronUp size={14} />
    </button>
  </div>
</div>

<style>
  .collapsed-bar {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0 0.9rem;
    border-radius: 0;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background:
      radial-gradient(circle at top right, rgba(83, 242, 199, 0.18), transparent 32%),
      linear-gradient(180deg, rgba(17, 24, 31, 0.94) 0%, rgba(10, 14, 19, 0.96) 100%);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
    transition:
      opacity 180ms ease,
      border-color 180ms ease,
      background 180ms ease;
  }

  .collapsed-bar.native-chrome {
    min-height: 72px;
    align-items: flex-end;
    padding: 26px 0.9rem 0.35rem;
  }

  .collapsed-bar.drifting {
    opacity: max(0.52, var(--collapsed-opacity, 0.72));
    border-color: rgba(255, 107, 122, 0.18);
    background:
      radial-gradient(circle at top right, rgba(255, 107, 122, 0.16), transparent 30%),
      linear-gradient(180deg, rgba(24, 18, 22, 0.94) 0%, rgba(15, 11, 14, 0.96) 100%);
  }

  .bar-section {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    min-width: 0;
  }

  .brand {
    flex: 1.5;
    min-width: 0;
  }

  .label-stack {
    min-width: 0;
  }

  .task {
    font-size: 0.82rem;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .state,
  .metric-label {
    font-size: 0.62rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.48);
  }

  .metric {
    gap: 0.45rem;
  }

  .metric-value {
    font-size: 0.76rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .current-app {
    min-width: 0;
    flex: 1;
  }

  .bar-divider {
    width: 1px;
    height: 1.5rem;
    background: rgba(255, 255, 255, 0.08);
    flex: none;
  }

  .bar-spacer {
    flex: 1;
  }

  .bar-actions {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  .icon-btn {
    display: grid;
    place-items: center;
    width: 1.9rem;
    height: 1.9rem;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.07);
    background: rgba(255, 255, 255, 0.04);
    color: rgba(255, 255, 255, 0.78);
    transition:
      transform 140ms ease,
      background 140ms ease,
      color 140ms ease;
  }

  .icon-btn:hover {
    transform: translateY(-1px);
    background: rgba(255, 255, 255, 0.09);
    color: white;
  }
</style>
