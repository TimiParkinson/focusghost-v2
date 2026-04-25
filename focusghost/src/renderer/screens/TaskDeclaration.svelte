<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import Ghost from '../components/Ghost.svelte';
  import { settings, screen, resetChat } from '../stores';

  const DURATIONS = [15, 30, 45, 60];

  let task = $state('');
  let duration = $state(15);
  let inputEl: HTMLInputElement;
  let containerEl: HTMLDivElement;

  $effect(() => {
    duration = $settings.defaultDurationMin || 15;
  });

  onMount(() => {
    if (containerEl) {
      gsap.fromTo(
        containerEl.children,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power3.out' },
      );
    }
    inputEl?.focus();
  });

  async function start(): Promise<void> {
    if (!task.trim()) return;
    resetChat();
    await window.api.sessionStart({ taskName: task.trim(), durationMin: duration, startedAt: Date.now() });
    screen.set('active');
  }
</script>

<div
  class="h-full flex flex-col items-center justify-center px-8 py-6 gap-6"
  bind:this={containerEl}
  data-testid="screen-task"
>
  <Ghost size={120} />
  <div class="text-center">
    <div class="label">FOCUS SESSION</div>
    <div class="font-display text-2xl mt-1">What are you working on?</div>
  </div>
  <input
    bind:this={inputEl}
    data-testid="input-task"
    class="w-full max-w-sm bg-ink-700 border border-white/10 rounded-lg px-4 py-3 text-base outline-none focus:accent-border focus:border-2"
    placeholder="e.g., refactor session machine"
    bind:value={task}
    onkeydown={(e) => {
      if (e.key === 'Enter' && task.trim()) void start();
    }}
  />
  <div class="flex gap-2">
    {#each DURATIONS as d (d)}
      <button
        data-testid="duration-{d}"
        onclick={() => (duration = d)}
        class="pill border {duration === d ? 'accent-bg-dim accent-border' : 'border-white/10 text-white/60 hover:text-white'}"
      >
        {d}m
      </button>
    {/each}
  </div>
  <button
    data-testid="btn-start-session"
    class="btn btn-primary !px-8 !py-3"
    disabled={!task.trim()}
    onclick={start}
  >
    Start focus session
  </button>
  <div class="text-xs text-white/40">↵ to start</div>
</div>
