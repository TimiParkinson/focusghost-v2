// Settings screen — appearance, nudges, session defaults, persistence via electron-store.
import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useUI } from '../store';
import { applyAccentClass } from '../api';
import { applyPreset, SENSITIVITY_PRESETS } from '../../shared/presets';
import type { AccentTheme, GhostPersonality, SensitivityPreset } from '../../shared/types';

export default function Settings(): JSX.Element {
  const ui = useUI();
  const s = ui.settings;

  const update = async (patch: Partial<typeof s>) => {
    const next = await window.api.updateSettings(patch);
    ui.setSettings(next);
    if (patch.accent) applyAccentClass(patch.accent);
  };

  const setPreset = (preset: SensitivityPreset) => {
    const next = applyPreset(preset, s);
    void update({
      sensitivity: preset,
      driftThresholdMin: next.driftThresholdMin,
      switchTriggerCount: next.switchTriggerCount,
      inactivityThresholdSec: next.inactivityThresholdSec,
    });
  };

  return (
    <div className="h-full overflow-y-auto px-5 py-5 space-y-5" data-testid="screen-settings">
      <div className="flex items-center gap-2">
        <button className="btn-ghost btn !p-2" onClick={() => ui.setScreen('task')} data-testid="btn-settings-back">
          <ArrowLeft size={14} />
        </button>
        <div className="font-display text-lg">Settings</div>
      </div>

      <Section label="APPEARANCE">
        <Row label="Accent">
          <div className="flex gap-2">
            {(['teal', 'violet', 'amber'] as AccentTheme[]).map((c) => (
              <button
                key={c}
                data-testid={`accent-${c}`}
                onClick={() => update({ accent: c })}
                className={`pill border ${s.accent === c ? 'accent-bg-dim accent-border' : 'border-white/10 text-white/60'}`}
              >
                {c}
              </button>
            ))}
          </div>
        </Row>
        <Row label={`Opacity ${Math.round(s.opacity * 100)}%`}>
          <input
            type="range"
            min={0.3}
            max={1}
            step={0.05}
            value={s.opacity}
            data-testid="opacity-slider"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              void update({ opacity: v });
              void window.api.setOpacity(v);
            }}
            className="w-full"
          />
        </Row>
        <Row label="Always on top">
          <Toggle
            checked={s.alwaysOnTop}
            onChange={(v) => {
              void update({ alwaysOnTop: v });
              void window.api.setAlwaysOnTop(v);
            }}
            testId="toggle-aot"
          />
        </Row>
      </Section>

      <Section label="NUDGES">
        <Row label="Sensitivity">
          <div className="flex gap-2">
            {(['gentle', 'balanced', 'strict'] as SensitivityPreset[]).map((p) => (
              <button
                key={p}
                data-testid={`preset-${p}`}
                onClick={() => setPreset(p)}
                className={`pill border ${s.sensitivity === p ? 'accent-bg-dim accent-border' : 'border-white/10 text-white/60'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </Row>
        <Row label={`Drift threshold: ${s.driftThresholdMin}m`}>
          <input
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={s.driftThresholdMin}
            data-testid="drift-threshold"
            onChange={(e) => update({ driftThresholdMin: parseFloat(e.target.value) })}
            className="w-full"
          />
        </Row>
        <Row label={`Switch trigger: ${s.switchTriggerCount}`}>
          <input
            type="range"
            min={2}
            max={15}
            step={1}
            value={s.switchTriggerCount}
            data-testid="switch-trigger"
            onChange={(e) => update({ switchTriggerCount: parseInt(e.target.value, 10) })}
            className="w-full"
          />
        </Row>
        <Row label={`Inactivity: ${s.inactivityThresholdSec}s`}>
          <input
            type="range"
            min={15}
            max={300}
            step={5}
            value={s.inactivityThresholdSec}
            data-testid="inactivity-threshold"
            onChange={(e) => update({ inactivityThresholdSec: parseInt(e.target.value, 10) })}
            className="w-full"
          />
        </Row>
        <div className="text-[11px] text-white/40">
          Preset baseline — gentle: {SENSITIVITY_PRESETS.gentle.driftThresholdMin}m / balanced:{' '}
          {SENSITIVITY_PRESETS.balanced.driftThresholdMin}m / strict: {SENSITIVITY_PRESETS.strict.driftThresholdMin}m
        </div>
      </Section>

      <Section label="SESSION DEFAULTS">
        <Row label={`Default duration: ${s.defaultDurationMin}m`}>
          <input
            type="range"
            min={10}
            max={90}
            step={5}
            value={s.defaultDurationMin}
            data-testid="default-duration"
            onChange={(e) => update({ defaultDurationMin: parseInt(e.target.value, 10) })}
            className="w-full"
          />
        </Row>
        <Row label="Ghost personality">
          <div className="flex gap-2">
            {(['encouraging', 'neutral', 'playful'] as GhostPersonality[]).map((g) => (
              <button
                key={g}
                data-testid={`personality-${g}`}
                onClick={() => update({ ghostPersonality: g })}
                className={`pill border ${s.ghostPersonality === g ? 'accent-bg-dim accent-border' : 'border-white/10 text-white/60'}`}
              >
                {g}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Demo mode">
          <Toggle
            checked={s.demoMode}
            onChange={(v) => update({ demoMode: v })}
            testId="toggle-demo"
          />
        </Row>
      </Section>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="label">{label}</div>
      <div className="card space-y-3">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-white/60">{label}</div>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  testId,
}: {
  checked: boolean;
  onChange: (b: boolean) => void;
  testId: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className="w-10 h-6 rounded-full p-0.5 transition-colors"
      style={{ background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.1)' }}
    >
      <div
        className="w-5 h-5 rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  );
}
