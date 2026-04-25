// Screen 02 - Active Session panel. Live timer + stats + drift risk + recent activity.
import React, { useMemo } from 'react';
import { useUI } from '../store';
import { AppCategory, DriftRisk } from '../../shared/types';
import Ghost from '../components/Ghost';

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const RISK_COLOR: Record<DriftRisk, string> = {
  [DriftRisk.LOW]: '#22c55e',
  [DriftRisk.MEDIUM]: '#F59E0B',
  [DriftRisk.HIGH]: '#FF6B7A',
};

export default function ActiveSession(): JSX.Element {
  const ui = useUI();
  const stats = ui.stats;
  const recent = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.appTimeMap)
      .sort((a, b) => b[1].lastSeenAt - a[1].lastSeenAt)
      .slice(0, 5);
  }, [stats]);

  if (!stats || stats.startedAt === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/50" data-testid="screen-active-empty">
        No active session. Start one from the Task tab.
      </div>
    );
  }

  const inFocus = stats.currentAppCategory === AppCategory.FOCUS || stats.currentAppCategory === AppCategory.RESEARCH;

  return (
    <div className="h-full overflow-y-auto px-5 py-5 space-y-4" data-testid="screen-active">
      <div className="flex items-start justify-between">
        <div>
          <div className="label">CURRENT TASK</div>
          <div className="font-display text-lg mt-1" data-testid="active-task-name">
            {stats.taskName}
          </div>
        </div>
        <div className="text-right">
          <div className="label">REMAINING</div>
          <div className="font-display text-3xl tabular-nums accent-text" data-testid="active-timer">
            {fmt(stats.remainingMs)}
          </div>
        </div>
      </div>

      <div className="card flex items-center gap-3">
        <Ghost size={44} drifting={!inFocus} />
        <div className="flex-1">
          <div className="text-xs text-white/50">CURRENT APP</div>
          <div className="text-sm" data-testid="current-app">
            {stats.currentApp ?? '—'}
          </div>
        </div>
        <div className={`pill ${inFocus ? 'accent-bg-dim' : ''}`} style={{ background: inFocus ? undefined : 'rgba(255,107,122,0.15)', color: inFocus ? undefined : '#FF6B7A' }} data-testid="app-badge">
          {inFocus ? 'FOCUS' : stats.currentAppCategory === AppCategory.DISTRACTION ? 'DRIFT' : 'NEUTRAL'}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Switches" value={stats.switchCount.toString()} testId="stat-switches" />
        <Stat label="Focus" value={fmt(stats.focusMs)} testId="stat-focus" />
        <Stat label="Drift" value={fmt(stats.driftMs)} testId="stat-drift" />
      </div>

      <div className="card flex items-center justify-between" data-testid="drift-risk-card">
        <div>
          <div className="label">DRIFT RISK</div>
          <div className="text-base font-semibold mt-1" style={{ color: RISK_COLOR[stats.driftRisk] }}>
            {stats.driftRisk}
          </div>
        </div>
        <div className="flex gap-1">
          {[DriftRisk.LOW, DriftRisk.MEDIUM, DriftRisk.HIGH].map((r) => (
            <div
              key={r}
              className="w-8 h-2 rounded-full"
              style={{
                background:
                  r === stats.driftRisk
                    ? RISK_COLOR[r]
                    : 'rgba(255,255,255,0.08)',
              }}
            />
          ))}
        </div>
      </div>

      <div className="card">
        <div className="label mb-2">RECENT ACTIVITY</div>
        {recent.length === 0 ? (
          <div className="text-sm text-white/40">No activity yet</div>
        ) : (
          <div className="space-y-2">
            {recent.map(([app, e]) => (
              <div key={app} className="flex items-center justify-between text-sm" data-testid={`recent-${app}`}>
                <div className="flex items-center gap-2">
                  <span
                    className="dot"
                    style={{
                      background:
                        e.category === AppCategory.DISTRACTION
                          ? '#FF6B7A'
                          : e.category === AppCategory.FOCUS
                            ? 'var(--accent)'
                            : 'rgba(255,255,255,0.3)',
                    }}
                  />
                  <span>{app}</span>
                </div>
                <div className="flex gap-3 text-white/60 text-xs tabular-nums">
                  <span>{fmt(e.totalMs)}</span>
                  <span>×{e.switches}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          className="btn-ghost btn flex-1"
          data-testid="btn-sim-switch"
          onClick={() => {
            const apps = ['Twitter', 'YouTube', 'Code', 'Chrome', 'Discord'];
            const pick = apps[Math.floor(Math.random() * apps.length)];
            void window.api.devSimulateSwitch(pick, 'simulated');
          }}
        >
          Simulate switch
        </button>
        <button
          className="btn flex-1"
          data-testid="btn-end-session"
          onClick={() => window.api.sessionEnd()}
        >
          End session
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="card" data-testid={testId}>
      <div className="label">{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}
