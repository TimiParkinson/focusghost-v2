<script lang="ts">
  import { onMount } from 'svelte';
  import gsap from 'gsap';
  import {
    screen,
    collapsed,
    settings,
    sessionState,
    recap,
    setStatsAndRisk,
    appendChat,
    addPattern,
    pendingNudge,
    pendingStuck,
    chatBusy,
  } from './stores';
  import { applyAccentClass } from './api';
  import { windowMode } from './window';
  import { SessionState } from '../shared/types';
  import TaskDeclaration from './screens/TaskDeclaration.svelte';
  import ActiveSession from './screens/ActiveSession.svelte';
  import GhostChat from './screens/GhostChat.svelte';
  import Recap from './screens/Recap.svelte';
  import Settings from './screens/Settings.svelte';
  import History from './screens/History.svelte';
  import CategoryEditor from './screens/CategoryEditor.svelte';
  import CollapsedBar from './components/CollapsedBar.svelte';
  import Header from './components/Header.svelte';

  let shellEl: HTMLDivElement | undefined = $state();
  let panelLayerEl: HTMLDivElement | undefined = $state();
  let collapsedLayerEl: HTMLDivElement | undefined = $state();
  let lastCollapsed = $state(false);

  function animateShell(collapsedNow: boolean, immediate = false): void {
    if (!shellEl || !panelLayerEl || !collapsedLayerEl) return;

    const panelChunks = panelLayerEl.querySelectorAll<HTMLElement>('[data-panel-chunk]');
    const tl = gsap.timeline({
      defaults: {
        duration: immediate ? 0 : 0.34,
        ease: collapsedNow ? 'power2.out' : 'back.out(1.25)',
      },
    });

    tl.to(
      shellEl,
      {
        borderRadius: 0,
        boxShadow: collapsedNow
          ? '0 18px 38px rgba(0,0,0,0.28)'
          : '0 28px 80px rgba(0,0,0,0.42)',
      },
      0,
    );
    tl.to(
      panelLayerEl,
      {
        opacity: collapsedNow ? 0 : 1,
        y: collapsedNow ? -18 : 0,
        scale: collapsedNow ? 0.965 : 1,
        pointerEvents: collapsedNow ? 'none' : 'auto',
        duration: immediate ? 0 : collapsedNow ? 0.18 : 0.32,
        ease: collapsedNow ? 'power2.inOut' : 'power3.out',
      },
      0,
    );
    tl.to(
      collapsedLayerEl,
      {
        opacity: collapsedNow ? 1 : 0,
        y: collapsedNow ? 0 : 8,
        scale: collapsedNow ? 1 : 0.985,
        pointerEvents: collapsedNow ? 'auto' : 'none',
        duration: immediate ? 0 : collapsedNow ? 0.28 : 0.18,
        ease: collapsedNow ? 'back.out(1.4)' : 'power2.inOut',
      },
      collapsedNow ? 0.06 : 0,
    );

    if (!collapsedNow && panelChunks.length) {
      tl.fromTo(
        panelChunks,
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          stagger: 0.035,
          duration: immediate ? 0 : 0.24,
          ease: 'power2.out',
        },
        0.08,
      );
    }
  }

  onMount(() => {
    const offs: Array<() => void> = [];
    offs.push(window.api.onSessionState((s) => sessionState.set(s)));
    offs.push(window.api.onStatsUpdate((s) => setStatsAndRisk(s)));
    offs.push(
      window.api.onSessionRecap((r) => {
        recap.set(r);
        screen.set('recap');
      }),
    );
    offs.push(
      window.api.onNudge((n) => {
        pendingNudge.set(n);
        screen.set('active');
        appendChat({
          id: n.id,
          variant: 'nudge',
          text: n.text,
          timestamp: Date.now(),
          meta: { reason: n.reason },
        });
      }),
    );
    offs.push(
      window.api.onStuckActivate((p) => {
        pendingStuck.set(p);
        screen.set('chat');
      }),
    );
    offs.push(
      window.api.onChatReply((m) => {
        appendChat(m);
        chatBusy.set(false);
      }),
    );
    offs.push(
      window.api.onStuckResponse((m) => {
        appendChat(m);
        chatBusy.set(false);
      }),
    );
    offs.push(window.api.onPatternNotice((p) => addPattern(p)));
    offs.push(
      window.api.onSettingsChanged((s) => {
        settings.set(s);
        applyAccentClass(s.accent);
      }),
    );
    offs.push(
      window.api.onCollapsedState((next) => {
        collapsed.set(next);
      }),
    );
    offs.push(
      window.api.onModeChanged((mode) => {
        windowMode.set(mode);
      }),
    );

    void window.api.getSettings().then((s) => {
      settings.set(s);
      applyAccentClass(s.accent);
    });

    queueMicrotask(() => {
      if (shellEl) {
        gsap.fromTo(
          shellEl,
          { opacity: 0, y: 18, scale: 0.96, transformOrigin: 'top right' },
          { opacity: 1, y: 0, scale: 1, duration: 0.38, ease: 'back.out(1.3)' },
        );
      }
      animateShell(false, true);
    });

    return () => offs.forEach((o) => o());
  });

  let lastSeenState: SessionState = SessionState.IDLE;
  $effect(() => {
    if ($sessionState !== lastSeenState) {
      if ($sessionState === SessionState.RECAP) screen.set('recap');
      lastSeenState = $sessionState;
    }
  });

  $effect(() => {
    if ($pendingNudge && $collapsed) {
      screen.set('active');
      void window.api.expand();
    }
  });

  $effect(() => {
    if ($pendingNudge && !$collapsed && $windowMode !== 'popupNudge') {
      void window.api.setMode('inlineNudge');
    } else if (!$pendingNudge && $windowMode === 'inlineNudge') {
      void window.api.setMode('panel');
    }
  });

  $effect(() => {
    if ($collapsed !== lastCollapsed) {
      animateShell($collapsed);
      lastCollapsed = $collapsed;
    }
  });
</script>

<div class:collapsed-viewport={$collapsed} class="app-viewport h-screen w-screen" data-testid="app-root">
  <div class:collapsed-shell={$collapsed} class="shell relative h-full overflow-hidden" bind:this={shellEl}>
    <div class="panel-layer absolute inset-0 flex flex-col" bind:this={panelLayerEl}>
      <div data-panel-chunk>
        <Header />
      </div>
      <div class="flex-1 overflow-hidden" data-panel-chunk>
        {#if $screen === 'task'}
          <TaskDeclaration />
        {:else if $screen === 'active'}
          <ActiveSession />
        {:else if $screen === 'chat'}
          <GhostChat />
        {:else if $screen === 'recap'}
          <Recap />
        {:else if $screen === 'settings'}
          <Settings />
        {:else if $screen === 'history'}
          <History />
        {:else if $screen === 'categories'}
          <CategoryEditor />
        {/if}
      </div>
    </div>

    <div class:collapsed-layer-tight={$collapsed} class="collapsed-layer absolute inset-0 p-1.5" bind:this={collapsedLayerEl}>
      <CollapsedBar />
    </div>
  </div>
</div>

<style>
  .app-viewport {
    background: #10171d;
  }

  .collapsed-viewport {
    background: transparent;
  }

  .shell {
    background:
      radial-gradient(circle at top right, rgba(83, 242, 199, 0.12), transparent 34%),
      linear-gradient(180deg, rgba(15, 20, 26, 0.96) 0%, rgba(8, 12, 16, 0.96) 100%);
    border: 0;
    border-radius: 0;
    box-shadow: none;
    backdrop-filter: blur(18px);
  }

  .collapsed-shell {
    background: transparent;
    border: 0;
    box-shadow: none;
    backdrop-filter: none;
  }

  .collapsed-layer {
    opacity: 0;
    pointer-events: none;
  }

  .collapsed-layer-tight {
    padding: 0;
  }
</style>
