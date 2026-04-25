<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import Ghost from '../components/Ghost.svelte';
  import { recap, screen, resetChat } from '../stores';
  import { AppCategory } from '../../shared/types';

  function fmt(ms: number): string {
    const total = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  let containerEl: HTMLDivElement;

  onMount(() => {
    if (containerEl) {
      gsap.fromTo(
        containerEl.children,
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' },
      );
    }
  });

  let total = $derived(($recap?.focusMs ?? 0) + ($recap?.driftMs ?? 0) + ($recap?.inactiveMs ?? 0) || 1);
  let topApps = $derived.by(() => {
    if (!$recap) return [];
    return Object.entries($recap.appTimeMap)
      .sort((a, b) => b[1].totalMs - a[1].totalMs)
      .slice(0, 5);
  });

  async function newSession(): Promise<void> {
    await window.api.sessionReset();
    resetChat();
    screen.set('task');
  }
</script>

{#if !$recap}
  <div class="h-full flex items-center justify-center text-white/50" data-testid="screen-recap-empty">
    No session to recap yet.
  </div>
{:else}
  <div class="h-full overflow-y-auto px-5 py-5 space-y-4" bind:this={containerEl} data-testid="screen-recap">
    <div class="text-center">
      <div class="label accent-text">SESSION COMPLETE</div>
      <div class="font-display text-xl mt-1" data-testid="recap-task">{$recap.taskName}</div>
      <div class="text-sm text-white/50 mt-1" data-testid="recap-duration">
        {Math.round((($recap.endedAt - $recap.startedAt) / 60000) * 10) / 10}m elapsed of {$recap.durationMin}m planned
      </div>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div class="card" data-testid="recap-focus">
        <div class="label">Focus</div>
        <div class="text-lg font-semibold tabular-nums mt-1">{fmt($recap.focusMs)}</div>
      </div>
      <div class="card" data-testid="recap-drift">
        <div class="label">Drift</div>
        <div class="text-lg font-semibold tabular-nums mt-1">{fmt($recap.driftMs)}</div>
      </div>
      <div class="card" data-testid="recap-switches">
        <div class="label">Switches</div>
        <div class="text-lg font-semibold tabular-nums mt-1">{$recap.switchCount}</div>
      </div>
      <div class="card" data-testid="recap-nudges">
        <div class="label">Nudges</div>
        <div class="text-lg font-semibold tabular-nums mt-1">{$recap.nudgeCount}</div>
      </div>
    </div>

    <div class="card">
      <div class="label mb-3">TOP APPS</div>
      {#if topApps.length === 0}
        <div class="text-sm text-white/40">No app time recorded</div>
      {:else}
        <div class="space-y-2">
          {#each topApps as [app, e] (app)}
            <div class="space-y-1" data-testid="top-{app}">
              <div class="flex justify-between text-xs">
                <span>{app}</span>
                <span class="text-white/60 tabular-nums">{fmt(e.totalMs)}</span>
              </div>
              <div class="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  class="h-full rounded-full"
                  style="width: {(e.totalMs / total) * 100}%; background: {e.category ===
                  AppCategory.DISTRACTION
                    ? '#FF6B7A'
                    : e.category === AppCategory.FOCUS
                      ? 'var(--accent)'
                      : 'rgba(255,255,255,0.5)'}"
                ></div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="card flex items-start gap-3">
      <Ghost size={40} />
      <div class="flex-1">
        <div class="label">GHOST INSIGHT</div>
        <div class="text-sm mt-1" data-testid="recap-insight">
          {$recap.ghostInsight ?? 'Generating insight…'}
        </div>
      </div>
    </div>

    <button class="btn btn-primary w-full !py-3" onclick={newSession} data-testid="btn-new-session">
      Start new session
    </button>
  </div>
{/if}
