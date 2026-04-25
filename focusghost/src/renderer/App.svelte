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
    offs.push(window.api.onCollapsedState((c) => collapsed.set(c)));

    void window.api.getSettings().then((s) => {
      settings.set(s);
      applyAccentClass(s.accent);
    });

    // Morph: panel scales in from top-right (where the anchor lives).
    if (shellEl) {
      gsap.fromTo(
        shellEl,
        { opacity: 0, scale: 0.85, transformOrigin: 'top right' },
        { opacity: 1, scale: 1, duration: 0.28, ease: 'back.out(1.6)' },
      );
    }

    return () => offs.forEach((o) => o());
  });

  // Auto-route on RECAP transition only (not on every screen change).
  let lastSeenState: SessionState = SessionState.IDLE;
  $effect(() => {
    if ($sessionState !== lastSeenState) {
      if ($sessionState === SessionState.RECAP) {
        screen.set('recap');
      }
      lastSeenState = $sessionState;
    }
  });
</script>

{#if $collapsed}
  <CollapsedBar />
{:else}
  <div class="h-screen w-screen p-3" data-testid="app-root">
    <div class="shell h-full flex flex-col" bind:this={shellEl}>
      <Header />
      <div class="flex-1 overflow-hidden">
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
  </div>
{/if}
