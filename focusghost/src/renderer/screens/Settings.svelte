<script lang="ts">
  import { ArrowLeft } from 'lucide-svelte';
  import { settings, screen } from '../stores';
  import { applyAccentClass } from '../api';
  import { applyPreset, SENSITIVITY_PRESETS } from '../../shared/presets';
  import type { AccentTheme, AppSettings, GhostPersonality, SensitivityPreset } from '../../shared/types';

  async function update(patch: Partial<AppSettings>): Promise<void> {
    const next = await window.api.updateSettings(patch);
    settings.set(next);
    if (patch.accent) applyAccentClass(patch.accent);
  }

  function setPreset(preset: SensitivityPreset): void {
    const next = applyPreset(preset, $settings);
    void update({
      sensitivity: preset,
      driftThresholdMin: next.driftThresholdMin,
      switchTriggerCount: next.switchTriggerCount,
      inactivityThresholdSec: next.inactivityThresholdSec,
    });
  }

  const accents: AccentTheme[] = ['teal', 'violet', 'amber'];
  const presets: SensitivityPreset[] = ['gentle', 'balanced', 'strict'];
  const personalities: GhostPersonality[] = ['encouraging', 'neutral', 'playful'];
</script>

<div class="h-full overflow-y-auto px-5 py-5 space-y-5" data-testid="screen-settings">
  <div class="flex items-center gap-2">
    <button
      class="btn-ghost btn !p-2"
      onclick={() => screen.set('task')}
      data-testid="btn-settings-back"
    >
      <ArrowLeft size={14} />
    </button>
    <div class="font-display text-lg">Settings</div>
  </div>

  <div class="space-y-3">
    <div class="label">APPEARANCE</div>
    <div class="card space-y-3">
      <div class="space-y-1.5">
        <div class="text-xs text-white/60">Accent</div>
        <div class="flex gap-2">
          {#each accents as c (c)}
            <button
              data-testid="accent-{c}"
              onclick={() => update({ accent: c })}
              class="pill border {$settings.accent === c
                ? 'accent-bg-dim accent-border'
                : 'border-white/10 text-white/60'}"
            >
              {c}
            </button>
          {/each}
        </div>
      </div>
      <div class="space-y-1.5">
        <div class="text-xs text-white/60">Opacity {Math.round($settings.opacity * 100)}%</div>
        <input
          type="range"
          min="0.3"
          max="1"
          step="0.05"
          value={$settings.opacity}
          data-testid="opacity-slider"
          onchange={(e) => {
            const v = parseFloat((e.target as HTMLInputElement).value);
            void update({ opacity: v });
            void window.api.setOpacity(v);
          }}
          class="w-full"
        />
      </div>
      <div class="space-y-1.5">
        <div class="text-xs text-white/60">Always on top</div>
        <button
          role="switch"
          aria-checked={$settings.alwaysOnTop}
          aria-label="Toggle always on top"
          data-testid="toggle-aot"
          onclick={() => {
            const v = !$settings.alwaysOnTop;
            void update({ alwaysOnTop: v });
            void window.api.setAlwaysOnTop(v);
          }}
          class="w-10 h-6 rounded-full p-0.5 transition-colors"
          style="background: {$settings.alwaysOnTop ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}"
        >
          <div
            class="w-5 h-5 rounded-full bg-white transition-transform"
            style="transform: {$settings.alwaysOnTop ? 'translateX(16px)' : 'translateX(0)'}"
          ></div>
        </button>
      </div>
    </div>
  </div>

  <div class="space-y-3">
    <div class="label">NUDGES</div>
    <div class="card space-y-3">
      <div class="space-y-1.5">
        <div class="text-xs text-white/60">Sensitivity</div>
        <div class="flex gap-2">
          {#each presets as p (p)}
            <button
              data-testid="preset-{p}"
              onclick={() => setPreset(p)}
              class="pill border {$settings.sensitivity === p
                ? 'accent-bg-dim accent-border'
                : 'border-white/10 text-white/60'}"
            >
              {p}
            </button>
          {/each}
        </div>
      </div>
      <div class="space-y-1.5">
        <div class="text-xs text-white/60">Drift threshold: {$settings.driftThresholdMin}m</div>
        <input
          type="range"
          min="1"
          max="10"
          step="0.5"
          value={$settings.driftThresholdMin}
          data-testid="drift-threshold"
          onchange={(e) => update({ driftThresholdMin: parseFloat((e.target as HTMLInputElement).value) })}
          class="w-full"
        />
      </div>
      <div class="space-y-1.5">
        <div class="text-xs text-white/60">Switch trigger: {$settings.switchTriggerCount}</div>
        <input
          type="range"
          min="2"
          max="15"
          step="1"
          value={$settings.switchTriggerCount}
          data-testid="switch-trigger"
          onchange={(e) =>
            update({ switchTriggerCount: parseInt((e.target as HTMLInputElement).value, 10) })}
          class="w-full"
        />
      </div>
      <div class="space-y-1.5">
        <div class="text-xs text-white/60">Inactivity: {$settings.inactivityThresholdSec}s</div>
        <input
          type="range"
          min="15"
          max="300"
          step="5"
          value={$settings.inactivityThresholdSec}
          data-testid="inactivity-threshold"
          onchange={(e) =>
            update({ inactivityThresholdSec: parseInt((e.target as HTMLInputElement).value, 10) })}
          class="w-full"
        />
      </div>
      <div class="text-[11px] text-white/40">
        Preset baseline — gentle: {SENSITIVITY_PRESETS.gentle.driftThresholdMin}m / balanced:
        {SENSITIVITY_PRESETS.balanced.driftThresholdMin}m / strict:
        {SENSITIVITY_PRESETS.strict.driftThresholdMin}m
      </div>
    </div>
  </div>

  <div class="space-y-3">
    <div class="label">SESSION DEFAULTS</div>
    <div class="card space-y-3">
      <div class="space-y-1.5">
        <div class="text-xs text-white/60">Default duration: {$settings.defaultDurationMin}m</div>
        <input
          type="range"
          min="10"
          max="90"
          step="5"
          value={$settings.defaultDurationMin}
          data-testid="default-duration"
          onchange={(e) =>
            update({ defaultDurationMin: parseInt((e.target as HTMLInputElement).value, 10) })}
          class="w-full"
        />
      </div>
      <div class="space-y-1.5">
        <div class="text-xs text-white/60">Ghost personality</div>
        <div class="flex gap-2">
          {#each personalities as g (g)}
            <button
              data-testid="personality-{g}"
              onclick={() => update({ ghostPersonality: g })}
              class="pill border {$settings.ghostPersonality === g
                ? 'accent-bg-dim accent-border'
                : 'border-white/10 text-white/60'}"
            >
              {g}
            </button>
          {/each}
        </div>
      </div>
      <div class="space-y-1.5">
        <div class="text-xs text-white/60">Demo mode</div>
        <button
          role="switch"
          aria-checked={$settings.demoMode}
          aria-label="Toggle demo mode"
          data-testid="toggle-demo"
          onclick={() => update({ demoMode: !$settings.demoMode })}
          class="w-10 h-6 rounded-full p-0.5 transition-colors"
          style="background: {$settings.demoMode ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}"
        >
          <div
            class="w-5 h-5 rounded-full bg-white transition-transform"
            style="transform: {$settings.demoMode ? 'translateX(16px)' : 'translateX(0)'}"
          ></div>
        </button>
      </div>
    </div>
  </div>

  <div class="space-y-3">
    <div class="label">DATA</div>
    <div class="card space-y-3">
      <button
        class="btn w-full justify-between"
        onclick={() => screen.set('categories')}
        data-testid="btn-open-categories"
      >
        <span>App categories</span>
        <span class="text-white/40 text-xs">override how apps are classified →</span>
      </button>
      <button
        class="btn w-full justify-between"
        onclick={() => screen.set('history')}
        data-testid="btn-open-history"
      >
        <span>Session history & streaks</span>
        <span class="text-white/40 text-xs">view past sessions →</span>
      </button>
    </div>
  </div>
</div>
