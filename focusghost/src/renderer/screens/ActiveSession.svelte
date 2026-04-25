<script lang="ts">
  import { stats } from '../stores';
  import { AppCategory, DriftRisk } from '../../shared/types';
  import Ghost from '../components/Ghost.svelte';
  import InlineNudge from '../components/InlineNudge.svelte';

  function fmt(ms: number): string {
    const total = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  const RISK_COLOR: Record<DriftRisk, string> = {
    [DriftRisk.LOW]: '#22c55e',
    [DriftRisk.MEDIUM]: '#F59E0B',
    [DriftRisk.HIGH]: '#FF6B7A',
  };

  let recent = $derived.by(() => {
    if (!$stats) return [];
    return Object.entries($stats.appTimeMap)
      .sort((a, b) => b[1].lastSeenAt - a[1].lastSeenAt)
      .slice(0, 5);
  });

  let inFocus = $derived(
    $stats?.currentAppCategory === AppCategory.FOCUS ||
      $stats?.currentAppCategory === AppCategory.RESEARCH,
  );

  function simulateSwitch(): void {
    const apps = ['Twitter', 'YouTube', 'Code', 'Chrome', 'Discord'];
    const pick = apps[Math.floor(Math.random() * apps.length)];
    void window.api.devSimulateSwitch(pick, 'simulated');
  }
</script>

{#if !$stats || $stats.startedAt === 0}
  <div class="h-full flex items-center justify-center text-white/50" data-testid="screen-active-empty">
    No active session. Start one from the Task tab.
  </div>
{:else}
  <div class="h-full overflow-y-auto px-5 py-5 space-y-4" data-testid="screen-active">
    <InlineNudge />
    <div class="flex items-start justify-between">
      <div>
        <div class="label">CURRENT TASK</div>
        <div class="font-display text-lg mt-1" data-testid="active-task-name">{$stats.taskName}</div>
      </div>
      <div class="text-right">
        <div class="label">REMAINING</div>
        <div class="font-display text-3xl tabular-nums accent-text" data-testid="active-timer">
          {fmt($stats.remainingMs)}
        </div>
      </div>
    </div>

    <div class="card flex items-center gap-3">
      <Ghost size={44} drifting={!inFocus} />
      <div class="flex-1">
        <div class="text-xs text-white/50">CURRENT APP</div>
        <div class="text-sm" data-testid="current-app">{$stats.currentApp ?? '—'}</div>
      </div>
      <div
        class="pill {inFocus ? 'accent-bg-dim' : ''}"
        style={inFocus
          ? ''
          : 'background: rgba(255,107,122,0.15); color: #FF6B7A'}
        data-testid="app-badge"
      >
        {inFocus
          ? 'FOCUS'
          : $stats.currentAppCategory === AppCategory.DISTRACTION
            ? 'DRIFT'
            : 'NEUTRAL'}
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <div class="card" data-testid="stat-switches">
        <div class="label">Switches</div>
        <div class="text-lg font-semibold tabular-nums mt-1">{$stats.switchCount}</div>
      </div>
      <div class="card" data-testid="stat-focus">
        <div class="label">Focus</div>
        <div class="text-lg font-semibold tabular-nums mt-1">{fmt($stats.focusMs)}</div>
      </div>
      <div class="card" data-testid="stat-drift">
        <div class="label">Drift</div>
        <div class="text-lg font-semibold tabular-nums mt-1">{fmt($stats.driftMs)}</div>
      </div>
    </div>

    <div class="card flex items-center justify-between" data-testid="drift-risk-card">
      <div>
        <div class="label">DRIFT RISK</div>
        <div class="text-base font-semibold mt-1" style="color: {RISK_COLOR[$stats.driftRisk]}">
          {$stats.driftRisk}
        </div>
      </div>
      <div class="flex gap-1">
        {#each [DriftRisk.LOW, DriftRisk.MEDIUM, DriftRisk.HIGH] as r (r)}
          <div
            class="w-8 h-2 rounded-full"
            style="background: {r === $stats.driftRisk ? RISK_COLOR[r] : 'rgba(255,255,255,0.08)'}"
          ></div>
        {/each}
      </div>
    </div>

    <div class="card">
      <div class="label mb-2">RECENT ACTIVITY</div>
      {#if recent.length === 0}
        <div class="text-sm text-white/40">No activity yet</div>
      {:else}
        <div class="space-y-2">
          {#each recent as [app, e] (app)}
            <div class="flex items-center justify-between text-sm" data-testid="recent-{app}">
              <div class="flex items-center gap-2">
                <span
                  class="dot"
                  style="background: {e.category === AppCategory.DISTRACTION
                    ? '#FF6B7A'
                    : e.category === AppCategory.FOCUS
                      ? 'var(--accent)'
                      : 'rgba(255,255,255,0.3)'}"
                ></span>
                <span>{app}</span>
              </div>
              <div class="flex gap-3 text-white/60 text-xs tabular-nums">
                <span>{fmt(e.totalMs)}</span>
                <span>×{e.switches}</span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="flex gap-2">
      <button class="btn-ghost btn flex-1" data-testid="btn-sim-switch" onclick={simulateSwitch}>
        Simulate switch
      </button>
      <button
        class="btn flex-1"
        data-testid="btn-end-session"
        onclick={() => window.api.sessionEnd()}
      >
        End session
      </button>
    </div>
  </div>
{/if}
