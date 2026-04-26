<script lang="ts">
  import { onDestroy } from 'svelte';
  import gsap from 'gsap';
  import { pendingNudge, appendChat } from '../stores';
  import Ghost from './Ghost.svelte';

  let cardEl: HTMLDivElement | undefined = $state();
  let progressEl: HTMLDivElement | undefined = $state();
  let dismissTimer: ReturnType<typeof setTimeout> | undefined;
  let progressTween: gsap.core.Tween | undefined;
  let lastSeenId = $state<string | null>(null);

  function dwellMs(text: string): number {
    const words = text.trim().split(/\s+/).length;
    return Math.max(2200, Math.min(7000, (words / 220) * 60000));
  }

  function scheduleDismiss(text: string): void {
    const dwell = dwellMs(text);
    progressTween?.kill();
    progressTween = progressEl
      ? gsap.fromTo(
          progressEl,
          { scaleX: 1 },
          { scaleX: 0, duration: dwell / 1000, ease: 'none', transformOrigin: 'left center' },
        )
      : undefined;
    clearTimeout(dismissTimer);
    dismissTimer = setTimeout(() => dismiss(false), dwell);
  }

  $effect(() => {
    const n = $pendingNudge;
    if (!n || !cardEl || lastSeenId === n.id) return;
    lastSeenId = n.id;
    gsap.fromTo(
      cardEl,
      { opacity: 0, y: 16, scale: 0.96, rotateX: -8, transformOrigin: 'top center' },
      { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.38, ease: 'back.out(1.25)' },
    );
    scheduleDismiss(n.text);
  });

  function dismiss(accepted: boolean): void {
    clearTimeout(dismissTimer);
    progressTween?.kill();
    const complete = () => {
      pendingNudge.set(null);
      void window.api.dismissNudge();
      appendChat({
        id: `ack_${Date.now()}`,
        variant: 'system',
        text: accepted ? 'Accepted nudge — back on it.' : 'Dismissed nudge.',
        timestamp: Date.now(),
      });
    };

    if (cardEl && $pendingNudge) {
      gsap.to(cardEl, {
        opacity: 0,
        y: -8,
        scale: 0.98,
        duration: 0.18,
        ease: 'power2.in',
        onComplete: complete,
      });
      return;
    }

    complete();
  }

  function pause(): void {
    progressTween?.pause();
    clearTimeout(dismissTimer);
  }

  function resume(): void {
    if (!$pendingNudge || !progressTween) return;
    progressTween.resume();
    const remaining = (1 - progressTween.progress()) * dwellMs($pendingNudge.text);
    dismissTimer = setTimeout(() => dismiss(false), remaining);
  }

  onDestroy(() => {
    clearTimeout(dismissTimer);
    progressTween?.kill();
  });
</script>

<div class:hidden={!$pendingNudge} class="inline-nudge-shell" data-testid="inline-nudge-shell">
  {#if $pendingNudge}
    <div
      class="inline-nudge accent-border"
      bind:this={cardEl}
      onmouseenter={pause}
      onmouseleave={resume}
      role="status"
      data-testid="inline-nudge"
    >
      <div class="ghost-pocket">
        <Ghost size={30} />
      </div>
      <div class="nudge-copy">
        <div class="eyebrow accent-text">Gentle nudge</div>
        <div class="message">{$pendingNudge.text}</div>
      </div>
      <div class="nudge-actions">
        <button
          class="btn btn-primary !py-2 !px-3 text-xs"
          onclick={() => dismiss(true)}
          data-testid="btn-inline-accept"
        >
          {$pendingNudge.ctas?.accept ?? 'On it'}
        </button>
        <button
          class="btn-ghost btn !py-2 !px-3 text-xs"
          onclick={() => dismiss(false)}
          data-testid="btn-inline-dismiss"
        >
          {$pendingNudge.ctas?.dismiss ?? 'Not now'}
        </button>
      </div>
      <div bind:this={progressEl} class="progress"></div>
    </div>
  {/if}
</div>

<style>
  .hidden {
    display: none;
  }

  .inline-nudge-shell {
    min-height: 0;
  }

  .inline-nudge {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.9rem;
    align-items: center;
    overflow: hidden;
    padding: 0.9rem 1rem 1rem;
    border-width: 1px;
    border-radius: 24px;
    background:
      radial-gradient(circle at top left, rgba(83, 242, 199, 0.14), transparent 30%),
      linear-gradient(180deg, rgba(20, 29, 36, 0.95) 0%, rgba(14, 20, 25, 0.97) 100%);
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.24);
  }

  .ghost-pocket {
    display: grid;
    place-items: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.05);
  }

  .eyebrow {
    font-size: 0.66rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
  }

  .message {
    font-size: 0.93rem;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.9);
  }

  .nudge-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .progress {
    position: absolute;
    left: 1rem;
    right: 1rem;
    bottom: 0;
    height: 2px;
    background: var(--accent);
    transform-origin: left center;
  }
</style>
