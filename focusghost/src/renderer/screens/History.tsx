// History screen — lists past sessions + cross-session streak.
import React, { useEffect, useRef, useState } from 'react';
import { Flame, Trophy, Clock, ListChecks, Trash2 } from 'lucide-react';
import gsap from 'gsap';
import Ghost from '../components/Ghost';
import { AppCategory, type SessionRecord, type StreakInfo } from '../../shared/types';

function fmt(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  const s = total % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

function dayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function History(): JSX.Element {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true);
    const [list, st] = await Promise.all([window.api.listHistory(), window.api.getStreak()]);
    setSessions(list);
    setStreak(st);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (loading || !ref.current) return;
    gsap.fromTo(
      ref.current.querySelectorAll('[data-anim]'),
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.04, ease: 'power3.out' },
    );
  }, [loading]);

  const clear = async () => {
    if (!confirm('Clear all session history? This cannot be undone.')) return;
    await window.api.clearHistory();
    void load();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-white/40" data-testid="history-loading">
        Loading history…
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-5 py-5 space-y-4" ref={ref} data-testid="screen-history">
      <div className="flex items-center justify-between">
        <div className="font-display text-lg">History</div>
        {sessions.length > 0 && (
          <button className="btn-ghost btn !py-1.5" onClick={clear} data-testid="btn-clear-history">
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2" data-anim>
        <StatCard
          icon={<Flame size={14} />}
          label="Current streak"
          value={`${streak?.current ?? 0}d`}
          testId="streak-current"
        />
        <StatCard
          icon={<Trophy size={14} />}
          label="Longest"
          value={`${streak?.longest ?? 0}d`}
          testId="streak-longest"
        />
        <StatCard
          icon={<Clock size={14} />}
          label="Total focus"
          value={fmt(streak?.totalFocusMs ?? 0)}
          testId="streak-total-focus"
        />
      </div>

      <Calendar streak={streak} />

      <div className="space-y-2" data-anim>
        <div className="label flex items-center gap-2">
          <ListChecks size={12} /> SESSIONS ({sessions.length})
        </div>
        {sessions.length === 0 ? (
          <div className="card text-sm text-white/50" data-testid="history-empty">
            No sessions yet. Finish your first focus session to see it here.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                open={openId === s.id}
                onToggle={() => setOpenId(openId === s.id ? null : s.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  testId: string;
}) {
  return (
    <div className="card" data-testid={testId} data-anim>
      <div className="flex items-center gap-2 text-white/50">
        <span className="accent-text">{icon}</span>
        <span className="label !text-[10px]">{label}</span>
      </div>
      <div className="text-lg font-semibold tabular-nums mt-1">{value}</div>
    </div>
  );
}

function Calendar({ streak }: { streak: StreakInfo | null }) {
  // Render last 30 days as a heatmap row.
  const days: { key: string; active: boolean }[] = [];
  if (streak) {
    const today = new Date();
    for (let i = 29; i >= 0; i -= 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      days.push({ key, active: streak.recentDays.includes(key) });
    }
  }
  return (
    <div className="card" data-anim data-testid="streak-calendar">
      <div className="label mb-2">LAST 30 DAYS</div>
      <div className="flex gap-1 flex-wrap">
        {days.map((d) => (
          <div
            key={d.key}
            title={d.key}
            className="w-3 h-6 rounded-sm"
            style={{
              background: d.active ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
            }}
          />
        ))}
      </div>
      <div className="text-[11px] text-white/40 mt-2">
        {streak?.todayHasSession
          ? 'Today counts — keep it going.'
          : 'No qualifying session today yet.'}
      </div>
    </div>
  );
}

function SessionRow({
  session,
  open,
  onToggle,
}: {
  session: SessionRecord;
  open: boolean;
  onToggle: () => void;
}) {
  const total = session.focusMs + session.driftMs + session.inactiveMs || 1;
  const focusPct = (session.focusMs / total) * 100;
  const driftPct = (session.driftMs / total) * 100;
  const topApps = Object.entries(session.appTimeMap)
    .sort((a, b) => b[1].totalMs - a[1].totalMs)
    .slice(0, 4);

  return (
    <div className="card !py-3" data-anim data-testid={`session-row-${session.id}`}>
      <button className="w-full text-left" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{session.taskName || 'Untitled task'}</div>
            <div className="text-[11px] text-white/50">{dayLabel(session.startedAt)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm tabular-nums accent-text">{fmt(session.focusMs)}</div>
            <div className="text-[10px] text-white/40">focus</div>
          </div>
        </div>
        <div className="mt-2 h-1.5 rounded-full overflow-hidden flex bg-white/5">
          <div className="h-full" style={{ width: `${focusPct}%`, background: 'var(--accent)' }} />
          <div className="h-full" style={{ width: `${driftPct}%`, background: '#FF6B7A' }} />
        </div>
      </button>
      {open && (
        <div className="mt-3 space-y-2" data-testid={`session-detail-${session.id}`}>
          <div className="grid grid-cols-4 gap-2 text-center">
            <Mini label="Focus" value={fmt(session.focusMs)} />
            <Mini label="Drift" value={fmt(session.driftMs)} />
            <Mini label="Switches" value={session.switchCount.toString()} />
            <Mini label="Nudges" value={session.nudgeCount.toString()} />
          </div>
          {session.ghostInsight && (
            <div className="card !p-3 flex gap-2 items-start">
              <Ghost size={28} />
              <div className="text-sm">{session.ghostInsight}</div>
            </div>
          )}
          {topApps.length > 0 && (
            <div className="card !p-3">
              <div className="label mb-2">TOP APPS</div>
              <div className="space-y-1.5">
                {topApps.map(([app, e]) => (
                  <div key={app} className="flex justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className="dot"
                        style={{
                          background:
                            e.category === AppCategory.DISTRACTION
                              ? '#FF6B7A'
                              : e.category === AppCategory.FOCUS
                                ? 'var(--accent)'
                                : 'rgba(255,255,255,0.4)',
                        }}
                      />
                      {app}
                    </span>
                    <span className="text-white/60 tabular-nums">{fmt(e.totalMs)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/[0.03] rounded-md py-1.5">
      <div className="text-[9px] text-white/40 uppercase tracking-wider">{label}</div>
      <div className="text-xs tabular-nums">{value}</div>
    </div>
  );
}
