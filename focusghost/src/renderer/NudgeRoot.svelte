<script lang="ts">
  // NudgeRoot — the popup-nudge surface. Lives in its own BrowserWindow.
  import { onMount, onDestroy } from 'svelte';
  import gsap from 'gsap';
  import Ghost from './components/Ghost.svelte';
  import { applyAccentClass } from './api';
  import type { NudgePayload } from '../shared/types';

  let nudge = $state<NudgePayload | null>(null);
  let cardEl: HTMLDivElement | undefined = $state();
  let unsubs: Array<() => void> = [];

  onMount(() => {
    void window.api.getSettings().then((s) => applyAccentClass(s.accent));
    unsubs.push(
      window.api.onNudge((n) => {
        nudge = n;
        if (cardEl) {
          gsap.fromTo(
            cardEl,
            { opacity: 0, y: -8, scale: 0.96 },
            { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: 'back.out(1.4)' },
          );
        }
      }),
    );
  });

  onDestroy(() => unsubs.forEach((o) => o()));

  function dismiss(): void {
    if (cardEl) {
      gsap.to(cardEl, {
        opacity: 0,
        y: -8,
        duration: 0.18,
        onComplete: () => {
          void window.api.dismissNudge(nudge?.id);
          nudge = null;
        },
      });
    } else {
      void window.api.dismissNudge(nudge?.id);
      nudge = null;
    }
  }

  function openPanel(): void {
    void window.api.openPanelFromNudge(nudge?.id);
    nudge = null;
  }

  // Hover pauses the auto-dismiss timer in main.
  function pauseDismiss(): void {
    void window.api.dismissNudge('__pause__');
  }
  function resumeDismiss(): void {
    // No explicit resume IPC — the controller tracks via setTimeout. We just leave it.
  }
</script>

{#if nudge}
  <div
    class="nudge-card"
    bind:this={cardEl}
    onmouseenter={pauseDismiss}
    onmouseleave={resumeDismiss}
    role="alert"
    data-testid="popup-nudge"
  >
    <div class="nudge-row">
      <Ghost size={28} />
      <div class="nudge-text" data-testid="popup-nudge-text">{nudge.text}</div>
    </div>
    <div class="nudge-actions">
      <button class="btn-pill primary" onclick={openPanel} data-testid="btn-popup-accept">
        {nudge.ctas?.accept ?? 'Open'}
      </button>
      <button class="btn-pill ghost" onclick={dismiss} data-testid="btn-popup-dismiss">
        {nudge.ctas?.dismiss ?? 'Dismiss'}
      </button>
    </div>
  </div>
{/if}

<style>
  :global(html, body, #root) {
    background: transparent;
    margin: 0;
    height: 100%;
    overflow: hidden;
  }
  .nudge-card {
    margin: 8px;
    padding: 12px 14px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(16, 23, 29, 0.96) 0%, rgba(11, 16, 20, 0.96) 100%);
    border: 1px solid var(--border);
    box-shadow:
      0 24px 48px rgba(0, 0, 0, 0.55),
      0 0 0 1px var(--accent-dim);
    backdrop-filter: blur(18px);
    color: var(--text);
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }
  .nudge-row {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .nudge-text {
    font-size: 13px;
    line-height: 1.45;
    flex: 1;
  }
  .nudge-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }
  .btn-pill {
    font-size: 11px;
    padding: 6px 12px;
    border-radius: 9999px;
    font-family: inherit;
    cursor: pointer;
    border: 1px solid transparent;
    transition: filter 120ms ease;
  }
  .btn-pill.primary {
    background: var(--accent);
    color: #08161a;
    font-weight: 600;
  }
  .btn-pill.primary:hover {
    filter: brightness(1.1);
  }
  .btn-pill.ghost {
    background: transparent;
    color: var(--text-dim, #9aa5af);
    border-color: var(--border);
  }
  .btn-pill.ghost:hover {
    color: var(--text);
  }
</style>
