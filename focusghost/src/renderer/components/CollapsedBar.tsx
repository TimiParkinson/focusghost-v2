// Always-on-top compact bar shown when window is collapsed.
import React from 'react';
import { Maximize2, Eye, EyeOff } from 'lucide-react';
import { useUI } from '../store';
import { AppCategory } from '../../shared/types';
import Ghost from './Ghost';

function fmt(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function CollapsedBar(): JSX.Element {
  const ui = useUI();
  const drifting = ui.stats?.currentAppCategory === AppCategory.DISTRACTION;
  const remaining = ui.stats?.remainingMs ?? 0;
  const task = ui.stats?.taskName || 'No active session';

  const cycleOpacity = async () => {
    const cur = ui.settings.opacity;
    const next = cur > 0.85 ? 0.75 : cur > 0.6 ? 0.45 : 1;
    await window.api.updateSettings({ opacity: next });
    await window.api.setOpacity(next);
  };

  return (
    <div
      className="drag h-full w-full flex items-center justify-between px-3"
      data-testid="collapsed-bar"
      style={{
        background: 'linear-gradient(180deg, rgba(16,23,29,0.92) 0%, rgba(11,16,20,0.92) 100%)',
        borderRadius: 10,
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2 no-drag">
        <Ghost size={28} drifting={drifting} />
        <span className="text-xs truncate max-w-[160px]" data-testid="bar-task">
          {task}
        </span>
        <span className="text-xs accent-text font-semibold tabular-nums" data-testid="bar-timer">
          {fmt(remaining)}
        </span>
      </div>
      <div className="flex items-center gap-2 no-drag">
        <span className="dot" style={{ background: drifting ? '#FF6B7A' : '#22c55e' }} />
        <span className="text-[10px] uppercase tracking-wider text-white/50 truncate max-w-[110px]">
          {ui.stats?.currentApp ?? '—'}
        </span>
        <button className="btn-ghost btn !p-1" onClick={cycleOpacity} title="Opacity">
          {ui.settings.opacity < 0.7 ? <EyeOff size={12} /> : <Eye size={12} />}
        </button>
        <button
          className="btn-ghost btn !p-1"
          onClick={() => window.api.toggleCollapsed()}
          title="Expand"
          data-testid="btn-expand"
        >
          <Maximize2 size={12} />
        </button>
      </div>
    </div>
  );
}
