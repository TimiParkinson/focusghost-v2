<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, Search } from 'lucide-svelte';
  import { screen } from '../stores';
  import { AppCategory, type KnownApp } from '../../shared/types';

  const CATEGORIES: AppCategory[] = [
    AppCategory.FOCUS,
    AppCategory.RESEARCH,
    AppCategory.DISTRACTION,
    AppCategory.UNKNOWN,
  ];

  const CATEGORY_COLOR: Record<AppCategory, string> = {
    [AppCategory.FOCUS]: 'var(--accent)',
    [AppCategory.RESEARCH]: '#A0AEC0',
    [AppCategory.DISTRACTION]: '#FF6B7A',
    [AppCategory.UNKNOWN]: 'rgba(255,255,255,0.4)',
  };

  let apps = $state<KnownApp[]>([]);
  let filter = $state('');
  let loading = $state(true);
  let customApp = $state('');

  function fmt(ms: number): string {
    if (ms < 60_000) return '<1m';
    const m = Math.round(ms / 60_000);
    if (m < 60) return `${m}m`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  }

  async function load(): Promise<void> {
    loading = true;
    const list = await window.api.listKnownApps();
    apps = list;
    loading = false;
  }

  onMount(() => void load());

  let visible = $derived.by(() => {
    if (!filter.trim()) return apps;
    const q = filter.toLowerCase();
    return apps.filter((a) => a.app.toLowerCase().includes(q));
  });

  async function setCategory(app: string, cat: AppCategory): Promise<void> {
    await window.api.setCategory(app, cat);
    apps = apps.map((a) => (a.app === app ? { ...a, override: cat } : a));
  }

  async function addCustom(): Promise<void> {
    const name = customApp.trim();
    if (!name) return;
    await window.api.setCategory(name, AppCategory.FOCUS);
    customApp = '';
    void load();
  }
</script>

<div class="h-full overflow-y-auto px-5 py-5 space-y-4" data-testid="screen-categories">
  <div class="flex items-center gap-2">
    <button
      class="btn-ghost btn !p-2"
      onclick={() => screen.set('settings')}
      data-testid="btn-categories-back"
    >
      <ArrowLeft size={14} />
    </button>
    <div class="font-display text-lg">App categories</div>
  </div>

  <div class="text-xs text-white/50 leading-relaxed">
    Override how FocusGhost classifies an app. Drives the drift-risk scorer and the FOCUS / DRIFT
    badges in your active session.
  </div>

  <div class="card !p-3 flex items-center gap-2">
    <Search size={14} class="text-white/40" />
    <input
      data-testid="categories-search"
      class="flex-1 bg-transparent outline-none text-sm placeholder-white/30"
      placeholder="Search apps…"
      bind:value={filter}
    />
  </div>

  <div class="card !p-3 space-y-2">
    <div class="label">ADD APP</div>
    <div class="flex gap-2">
      <input
        data-testid="categories-add-input"
        class="flex-1 bg-ink-700 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-white/30"
        placeholder="e.g., Linear, Postman, Bear"
        bind:value={customApp}
        onkeydown={(e) => e.key === 'Enter' && addCustom()}
      />
      <button
        class="btn btn-primary !py-2"
        onclick={addCustom}
        disabled={!customApp.trim()}
        data-testid="categories-add-btn"
      >
        Add
      </button>
    </div>
    <div class="text-[11px] text-white/40">
      Added apps default to FOCUS — pick a category below to change.
    </div>
  </div>

  {#if loading}
    <div class="text-white/40 text-sm">Loading apps…</div>
  {:else if visible.length === 0}
    <div class="card text-sm text-white/50" data-testid="categories-empty">
      {filter ? 'No apps match that search.' : 'No apps tracked yet — run a session first.'}
    </div>
  {:else}
    <div class="space-y-2">
      {#each visible as a (a.app)}
        {@const effective = a.override ?? a.defaultCategory}
        <div class="card !py-3 !px-3" data-testid="category-row-{a.app}">
          <div class="flex items-center justify-between mb-2">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="dot" style="background: {CATEGORY_COLOR[effective]}"></span>
                <span class="text-sm truncate">{a.app}</span>
                {#if a.override}
                  <span class="pill !py-0.5 !px-2 !text-[9px] accent-bg-dim">CUSTOM</span>
                {/if}
              </div>
              <div class="text-[10px] text-white/40 mt-0.5">
                {a.appearances > 0 ? `${a.appearances} sessions · ${fmt(a.totalMs)}` : 'No history yet'}
              </div>
            </div>
          </div>
          <div class="flex gap-1 flex-wrap">
            {#each CATEGORIES as c (c)}
              <button
                data-testid="set-{a.app}-{c}"
                onclick={() => setCategory(a.app, c)}
                class="pill border text-[10px] {effective === c
                  ? 'accent-bg-dim accent-border'
                  : 'border-white/10 text-white/55'}"
              >
                {c}
              </button>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
