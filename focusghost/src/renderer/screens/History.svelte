<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import { Flame, Trophy, Clock, ListChecks, Trash2 } from 'lucide-svelte';
  import Ghost from '../components/Ghost.svelte';
  import { AppCategory, type SessionRecord, type StreakInfo } from '../../shared/types';

  let sessions = $state<SessionRecord[]>([]);
  let streak = $state<StreakInfo | null>(null);
  let loading = $state(true);
  let openId = $state<string | null>(null);
  let containerEl: HTMLDivElement | undefined = $state();

  function fmt(ms: number): string {
    const total = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    const s = total % 60;
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  }

  function dayLabel(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }

  async function load(): Promise<void> {
    loading = true;
    const [list, st] = await Promise.all([window.api.listHistory(), window.api.getStreak()]);
    sessions = list;
    streak = st;
    loading = false;
  }

  onMount(() => {
    void load();
  });

  $effect(() => {
    if (loading || !containerEl) return;
    const root = containerEl;
    queueMicrotask(() => {
      gsap.fromTo(
        root.querySelectorAll('[data-anim]'),
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: 'power3.out' },
      );
    });
  });

  async function clear(): Promise<void> {
    if (!confirm('Clear all session history? This cannot be undone.')) return;
    await window.api.clearHistory();
    void load();
  }

  function calendarDays(): Array<{ key: string; active: boolean }> {
    if (!streak) return [];
    const today = new Date();
    const days: Array<{ key: string; active: boolean }> = [];
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      days.push({ key, active: streak.recentDays.includes(key) });
    }
    return days;
  }

  function topAppsOf(s: SessionRecord) {
    return Object.entries(s.appTimeMap)
      .sort((a, b) => b[1].totalMs - a[1].totalMs)
      .slice(0, 4);
  }
</script>

{#if loading}
  <div class="h-full flex items-center justify-center text-white/40" data-testid="history-loading">
    Loading history…
  </div>
{:else}
  <div
    class="h-full overflow-y-auto px-5 py-5 space-y-4"
    bind:this={containerEl}
    data-testid="screen-history"
  >
    <div class="flex items-center justify-between">
      <div class="font-display text-lg">History</div>
      {#if sessions.length > 0}
        <button class="btn-ghost btn !py-1.5" onclick={clear} data-testid="btn-clear-history">
          <Trash2 size={12} /> Clear
        </button>
      {/if}
    </div>

    <div class="grid grid-cols-3 gap-2" data-anim>
      <div class="card" data-testid="streak-current" data-anim>
        <div class="flex items-center gap-2 text-white/50">
          <span class="accent-text"><Flame size={14} /></span>
          <span class="label !text-[10px]">Current streak</span>
        </div>
        <div class="text-lg font-semibold tabular-nums mt-1">{streak?.current ?? 0}d</div>
      </div>
      <div class="card" data-testid="streak-longest" data-anim>
        <div class="flex items-center gap-2 text-white/50">
          <span class="accent-text"><Trophy size={14} /></span>
          <span class="label !text-[10px]">Longest</span>
        </div>
        <div class="text-lg font-semibold tabular-nums mt-1">{streak?.longest ?? 0}d</div>
      </div>
      <div class="card" data-testid="streak-total-focus" data-anim>
        <div class="flex items-center gap-2 text-white/50">
          <span class="accent-text"><Clock size={14} /></span>
          <span class="label !text-[10px]">Total focus</span>
        </div>
        <div class="text-lg font-semibold tabular-nums mt-1">{fmt(streak?.totalFocusMs ?? 0)}</div>
      </div>
    </div>

    <div class="card" data-anim data-testid="streak-calendar">
      <div class="label mb-2">LAST 30 DAYS</div>
      <div class="flex gap-1 flex-wrap">
        {#each calendarDays() as d (d.key)}
          <div
            title={d.key}
            class="w-3 h-6 rounded-sm"
            style="background: {d.active ? 'var(--accent)' : 'rgba(255,255,255,0.05)'}"
          ></div>
        {/each}
      </div>
      <div class="text-[11px] text-white/40 mt-2">
        {streak?.todayHasSession ? 'Today counts — keep it going.' : 'No qualifying session today yet.'}
      </div>
    </div>

    <div class="space-y-2" data-anim>
      <div class="label flex items-center gap-2">
        <ListChecks size={12} /> SESSIONS ({sessions.length})
      </div>
      {#if sessions.length === 0}
        <div class="card text-sm text-white/50" data-testid="history-empty">
          No sessions yet. Finish your first focus session to see it here.
        </div>
      {:else}
        {#each sessions as s (s.id)}
          {@const total = s.focusMs + s.driftMs + s.inactiveMs || 1}
          {@const focusPct = (s.focusMs / total) * 100}
          {@const driftPct = (s.driftMs / total) * 100}
          <div class="card !py-3" data-anim data-testid="session-row-{s.id}">
            <button
              class="w-full text-left"
              onclick={() => (openId = openId === s.id ? null : s.id)}
            >
              <div class="flex items-center justify-between">
                <div class="min-w-0">
                  <div class="text-sm font-medium truncate">{s.taskName || 'Untitled task'}</div>
                  <div class="text-[11px] text-white/50">{dayLabel(s.startedAt)}</div>
                </div>
                <div class="text-right">
                  <div class="text-sm tabular-nums accent-text">{fmt(s.focusMs)}</div>
                  <div class="text-[10px] text-white/40">focus</div>
                </div>
              </div>
              <div class="mt-2 h-1.5 rounded-full overflow-hidden flex bg-white/5">
                <div class="h-full" style="width: {focusPct}%; background: var(--accent)"></div>
                <div class="h-full" style="width: {driftPct}%; background: #FF6B7A"></div>
              </div>
            </button>
            {#if openId === s.id}
              <div class="mt-3 space-y-2" data-testid="session-detail-{s.id}">
                <div class="grid grid-cols-4 gap-2 text-center">
                  <div class="bg-white/[0.03] rounded-md py-1.5">
                    <div class="text-[9px] text-white/40 uppercase tracking-wider">Focus</div>
                    <div class="text-xs tabular-nums">{fmt(s.focusMs)}</div>
                  </div>
                  <div class="bg-white/[0.03] rounded-md py-1.5">
                    <div class="text-[9px] text-white/40 uppercase tracking-wider">Drift</div>
                    <div class="text-xs tabular-nums">{fmt(s.driftMs)}</div>
                  </div>
                  <div class="bg-white/[0.03] rounded-md py-1.5">
                    <div class="text-[9px] text-white/40 uppercase tracking-wider">Switches</div>
                    <div class="text-xs tabular-nums">{s.switchCount}</div>
                  </div>
                  <div class="bg-white/[0.03] rounded-md py-1.5">
                    <div class="text-[9px] text-white/40 uppercase tracking-wider">Nudges</div>
                    <div class="text-xs tabular-nums">{s.nudgeCount}</div>
                  </div>
                </div>
                {#if s.ghostInsight}
                  <div class="card !p-3 flex gap-2 items-start">
                    <Ghost size={28} />
                    <div class="text-sm">{s.ghostInsight}</div>
                  </div>
                {/if}
                {#if topAppsOf(s).length > 0}
                  <div class="card !p-3">
                    <div class="label mb-2">TOP APPS</div>
                    <div class="space-y-1.5">
                      {#each topAppsOf(s) as [app, e] (app)}
                        <div class="flex justify-between text-xs">
                          <span class="flex items-center gap-2">
                            <span
                              class="dot"
                              style="background: {e.category === AppCategory.DISTRACTION
                                ? '#FF6B7A'
                                : e.category === AppCategory.FOCUS
                                  ? 'var(--accent)'
                                  : 'rgba(255,255,255,0.4)'}"
                            ></span>
                            {app}
                          </span>
                          <span class="text-white/60 tabular-nums">{fmt(e.totalMs)}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>
  </div>
{/if}
