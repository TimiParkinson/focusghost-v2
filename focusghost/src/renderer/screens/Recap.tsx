// Screen 04 - Session Recap. Stats grid + top apps + ghost insight + new session CTA.
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import Ghost from '../components/Ghost';
import { useUI } from '../store';
import { AppCategory } from '../../shared/types';

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function Recap(): JSX.Element {
  const ui = useUI();
  const r = ui.recap;
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    gsap.fromTo(
      ref.current.children,
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.06, ease: 'power3.out' },
    );
  }, [r?.id]);

  if (!r) {
    return (
      <div className="h-full flex items-center justify-center text-white/50" data-testid="screen-recap-empty">
        No session to recap yet.
      </div>
    );
  }

  const total = r.focusMs + r.driftMs + r.inactiveMs || 1;
  const topApps = Object.entries(r.appTimeMap)
    .sort((a, b) => b[1].totalMs - a[1].totalMs)
    .slice(0, 5);

  const newSession = async () => {
    await window.api.sessionReset();
    ui.resetChat();
    ui.setScreen('task');
  };

  return (
    <div className="h-full overflow-y-auto px-5 py-5 space-y-4" ref={ref} data-testid="screen-recap">
      <div className="text-center">
        <div className="label accent-text">SESSION COMPLETE</div>
        <div className="font-display text-xl mt-1" data-testid="recap-task">
          {r.taskName}
        </div>
        <div className="text-sm text-white/50 mt-1" data-testid="recap-duration">
          {Math.round(((r.endedAt - r.startedAt) / 60000) * 10) / 10}m elapsed of {r.durationMin}m planned
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Stat label="Focus" value={fmt(r.focusMs)} testId="recap-focus" />
        <Stat label="Drift" value={fmt(r.driftMs)} testId="recap-drift" />
        <Stat label="Switches" value={r.switchCount.toString()} testId="recap-switches" />
        <Stat label="Nudges" value={r.nudgeCount.toString()} testId="recap-nudges" />
      </div>

      <div className="card">
        <div className="label mb-3">TOP APPS</div>
        {topApps.length === 0 ? (
          <div className="text-sm text-white/40">No app time recorded</div>
        ) : (
          <div className="space-y-2">
            {topApps.map(([app, e]) => {
              const pct = (e.totalMs / total) * 100;
              const color =
                e.category === AppCategory.DISTRACTION
                  ? '#FF6B7A'
                  : e.category === AppCategory.FOCUS
                    ? 'var(--accent)'
                    : 'rgba(255,255,255,0.5)';
              return (
                <div key={app} className="space-y-1" data-testid={`top-${app}`}>
                  <div className="flex justify-between text-xs">
                    <span>{app}</span>
                    <span className="text-white/60 tabular-nums">{fmt(e.totalMs)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card flex items-start gap-3">
        <Ghost size={40} />
        <div className="flex-1">
          <div className="label">GHOST INSIGHT</div>
          <div className="text-sm mt-1" data-testid="recap-insight">
            {r.ghostInsight ?? 'Generating insight…'}
          </div>
        </div>
      </div>

      <button className="btn btn-primary w-full !py-3" onClick={newSession} data-testid="btn-new-session">
        Start new session
      </button>
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
