<script lang="ts">
  import { Settings, Minimize2, Eye, EyeOff } from 'lucide-svelte';
  import { screen, settings } from '../stores';
  import type { Screen } from '../stores';

  const isMacElectron =
    typeof navigator !== 'undefined' &&
    navigator.platform.toLowerCase().includes('mac') &&
    navigator.userAgent.includes('Electron');

  const tabs: Array<{ id: Screen; label: string; testId: string }> = [
    { id: 'task', label: 'Task', testId: 'tab-task' },
    { id: 'active', label: 'Session', testId: 'tab-active' },
    { id: 'chat', label: 'Chat', testId: 'tab-chat' },
    { id: 'recap', label: 'Recap', testId: 'tab-recap' },
    { id: 'history', label: 'History', testId: 'tab-history' },
  ];

  async function cycleOpacity(): Promise<void> {
    const cur = $settings.opacity;
    const next = cur > 0.85 ? 0.75 : cur > 0.6 ? 0.45 : 1;
    await window.api.updateSettings({ opacity: next });
    await window.api.setOpacity(next);
  }
</script>

<div class:native-chrome={isMacElectron} class="header-shell border-b border-white/5">
  <div class="header-row no-drag flex items-center gap-2 px-4 py-2">
    <div class="header-brand flex-none" aria-hidden="true"></div>
    <div class="header-tabs no-drag flex min-w-0 flex-1 items-center justify-center gap-1">
    {#each tabs as t (t.id)}
      <button
        data-testid={t.testId}
        onclick={() => screen.set(t.id)}
        class="header-tab no-drag btn-ghost btn !px-2.5 !py-1.5 text-xs {$screen === t.id ? 'accent-text' : ''}"
        title={t.label}
      >
        {t.label}
      </button>
    {/each}
    </div>
    <div class="header-actions no-drag flex flex-none items-center gap-1">
      <button
        data-testid="btn-opacity"
        class="btn-ghost no-drag btn !p-2"
        onclick={cycleOpacity}
        title="Cycle opacity"
      >
        {#if $settings.opacity < 0.7}
          <EyeOff size={14} />
        {:else}
          <Eye size={14} />
        {/if}
      </button>
      <button
        data-testid="btn-collapse"
        class="btn-ghost no-drag btn !p-2"
        onclick={() => window.api.toggleCollapsed()}
        title="Collapse"
      >
        <Minimize2 size={14} />
      </button>
      <button
        data-testid="btn-settings"
        class="btn-ghost no-drag btn !p-2"
        onclick={() => screen.set('settings')}
        title="Settings"
      >
        <Settings size={14} />
      </button>
    </div>
  </div>
</div>

<style>
  .header-shell {
    position: relative;
    min-height: 56px;
    padding-top: 0;
    overflow: hidden;
  }

  .header-shell.native-chrome {
    min-height: 88px;
    padding-top: 34px;
  }

  .header-row {
    position: relative;
    z-index: 1;
    min-height: 48px;
  }

  .header-brand {
    min-width: 0;
    padding-left: 0;
  }

  .header-shell.native-chrome .header-brand {
    min-width: 92px;
    padding-left: 92px;
  }

  .header-tabs {
    overflow: hidden;
  }

  .header-tab {
    min-width: 0;
    flex: 1 1 0;
    justify-content: center;
    white-space: nowrap;
  }

  .header-actions {
    min-width: 116px;
  }
</style>
