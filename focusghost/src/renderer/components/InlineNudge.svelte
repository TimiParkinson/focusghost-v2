<script lang="ts">
  // InlineNudge — soft horizontal banner shown inside the panel when a nudge fires
  // while the user is on the Active Session screen. Less intrusive than a popup,
  // and auto-dismisses based on reading time (same formula as the popup window).
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

  $effect(() => {
    const n = $pendingNudge;
    if (!n || lastSeenId === n.id) return;
    lastSeenId = n.id;
    queueMicrotask(() => {
      if (cardEl) {
        gsap.fromTo(
          cardEl,
          { opacity: 0, y: -6, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'back.out(1.4)' },
        );
      }
      const dwell = dwellMs(n.text);
      if (progressEl) {
        progressTween?.kill();
        progressTween = gsap.fromTo(
          progressEl,
          { scaleX: 1 },
          { scaleX: 0, duration: dwell / 1000, ease: 'none', transformOrigin: 'left center' },
        );
      }
      clearTimeout(dismissTimer);
      dismissTimer = setTimeout(() => dismiss(false), dwell);
    });
  });

  function dismiss(accepted: boolean): void {
    clearTimeout(dismissTimer);
    progressTween?.kill();
    if (cardEl) {
      gsap.to(cardEl, {
        opacity: 0,
        y: -6,
        duration: 0.18,
        onComplete: () => pendingNudge.set(null),
      });
    } else {
      pendingNudge.set(null);
    }
    appendChat({
      id: `ack_${Date.now()}`,
      variant: 'system',
      text: accepted ? 'Accepted nudge — back on it.' : 'Dismissed nudge.',
      timestamp: Date.now(),
    });
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

{#if $pendingNudge}
  <div
    class="card accent-border relative overflow-hidden"
    bind:this={cardEl}
    onmouseenter={pause}
    onmouseleave={resume}
    style="border-width: 1px; padding-bottom: 14px"
    data-testid="inline-nudge"
  >
    <div class="flex gap-3 items-start">
      <Ghost size={28} />
      <div class="flex-1">
        <div class="label accent-text mb-1">NUDGE</div>
        <div class="text-sm whitespace-pre-wrap">{$pendingNudge.text}</div>
        <div class="flex gap-2 mt-3">
          <button
            class="btn btn-primary !py-1.5 !px-3 text-xs"
            onclick={() => dismiss(true)}
            data-testid="btn-inline-accept"
          >
            {$pendingNudge.ctas?.accept ?? 'On it'}
          </button>
          <button
            class="btn-ghost btn !py-1.5 !px-3 text-xs"
            onclick={() => dismiss(false)}
            data-testid="btn-inline-dismiss"
          >
            {$pendingNudge.ctas?.dismiss ?? 'Not now'}
          </button>
        </div>
      </div>
    </div>
    <div
      bind:this={progressEl}
      class="absolute bottom-0 left-0 h-0.5 w-full"
      style="background: var(--accent); transform-origin: left center"
    ></div>
  </div>
{/if}
