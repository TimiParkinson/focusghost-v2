<script lang="ts">
  import { Settings, Minimize2, Eye, EyeOff } from 'lucide-svelte';
  import { screen, settings } from '../stores';
  import type { Screen } from '../stores';

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

<div class="drag flex items-center justify-between px-4 py-2 border-b border-white/5">
  <div class="flex items-center gap-3 no-drag">
    <div class="w-2 h-2 rounded-full accent-bg"></div>
    <span class="text-sm font-display tracking-wide">FocusGhost</span>
  </div>
  <div class="no-drag flex items-center gap-1">
    {#each tabs as t (t.id)}
      <button
        data-testid={t.testId}
        onclick={() => screen.set(t.id)}
        class="btn-ghost btn !py-1.5 !px-3 text-xs {$screen === t.id ? 'accent-text' : ''}"
      >
        {t.label}
      </button>
    {/each}
  </div>
  <div class="no-drag flex items-center gap-1">
    <button
      data-testid="btn-opacity"
      class="btn-ghost btn !p-2"
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
      class="btn-ghost btn !p-2"
      onclick={() => window.api.toggleCollapsed()}
      title="Collapse"
    >
      <Minimize2 size={14} />
    </button>
    <button
      data-testid="btn-settings"
      class="btn-ghost btn !p-2"
      onclick={() => screen.set('settings')}
      title="Settings"
    >
      <Settings size={14} />
    </button>
  </div>
</div>
