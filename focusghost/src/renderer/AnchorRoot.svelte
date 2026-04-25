<script lang="ts">
  // AnchorRoot — passive ambient pill in the corner. Click expands to panel.
  import { onMount, onDestroy } from 'svelte';
  import gsap from 'gsap';
  import Ghost from './components/Ghost.svelte';
  import { sessionState, settings } from './stores';
  import { applyAccentClass } from './api';
  import { AppCategory, SessionState } from '../shared/types';
  import { stats } from './stores';

  let hovering = $state(false);
  let pulseEl: HTMLDivElement;
  let unsubs: Array<() => void> = [];

  onMount(() => {
    void window.api.getSettings().then((s) => {
      settings.set(s);
      applyAccentClass(s.accent);
    });
    unsubs.push(window.api.onSessionState((s) => sessionState.set(s)));
    unsubs.push(window.api.onStatsUpdate((s) => stats.set(s)));
    unsubs.push(
      window.api.onSettingsChanged((s) => {
        settings.set(s);
        applyAccentClass(s.accent);
      }),
    );
  });

  onDestroy(() => unsubs.forEach((o) => o()));

  $effect(() => {
    if (!pulseEl) return;
    if ($sessionState === SessionState.ACTIVE) {
      gsap.to(pulseEl, {
        scale: 1.18,
        opacity: 0.0,
        duration: 1.6,
        repeat: -1,
        ease: 'sine.out',
      });
    } else {
      gsap.killTweensOf(pulseEl);
      gsap.set(pulseEl, { scale: 1, opacity: 0.4 });
    }
  });

  function handleEnter(): void {
    hovering = true;
    void window.api.anchorHover(true);
  }

  function handleLeave(): void {
    hovering = false;
    void window.api.anchorHover(false);
  }

  function handleClick(): void {
    void window.api.anchorClick();
  }

  let drifting = $derived($stats?.currentAppCategory === AppCategory.DISTRACTION);
</script>

<div
  class="anchor-root"
  role="button"
  tabindex="0"
  onmouseenter={handleEnter}
  onmouseleave={handleLeave}
  onclick={handleClick}
  onkeydown={(e) => e.key === 'Enter' && handleClick()}
  data-testid="anchor-surface"
  style="opacity: {hovering ? 1 : 0.55}"
>
  <div class="anchor-pulse" bind:this={pulseEl}></div>
  <div class="anchor-disc">
    <Ghost size={32} drifting={drifting} state={$sessionState} />
  </div>
  {#if $sessionState === SessionState.ACTIVE && $stats}
    <div class="anchor-tag" data-testid="anchor-task">
      {$stats.taskName.slice(0, 16)}
    </div>
  {/if}
</div>

<style>
  :global(html, body, #root) {
    background: transparent;
    margin: 0;
    height: 100%;
  }
  .anchor-root {
    position: relative;
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      opacity 200ms ease,
      transform 160ms ease;
  }
  .anchor-root:hover {
    transform: scale(1.04);
  }
  .anchor-disc {
    width: 48px;
    height: 48px;
    border-radius: 9999px;
    background: radial-gradient(circle at 30% 30%, #1a242c 0%, #0b1014 100%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 8px 22px rgba(0, 0, 0, 0.4),
      0 0 0 1px var(--accent-dim);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 2;
  }
  .anchor-pulse {
    position: absolute;
    inset: 4px;
    border-radius: 9999px;
    background: var(--accent-dim);
    opacity: 0.4;
    z-index: 1;
  }
  .anchor-tag {
    position: absolute;
    top: -10px;
    right: 56px;
    font-size: 10px;
    background: rgba(11, 16, 20, 0.92);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 3px 8px;
    color: var(--text);
    white-space: nowrap;
    pointer-events: none;
  }
</style>
