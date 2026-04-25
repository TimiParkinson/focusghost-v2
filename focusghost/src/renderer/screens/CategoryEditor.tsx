// Custom app category editor — lists known apps, lets user override categories.
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useUI } from '../store';
import { AppCategory, type KnownApp } from '../../shared/types';

const CATEGORIES: AppCategory[] = [
  AppCategory.FOCUS,
  AppCategory.RESEARCH,
  AppCategory.DISTRACTION,
  AppCategory.UNKNOWN,
];

const CATEGORY_COLOR: Record<AppCategory, string> = {
  [AppCategory.FOCUS]: 'var(--accent)',
  [AppCategory.RESEARCH]: '#A0AEC0',
  [AppCategory.DISTRACTION]: '#FF6B7A',
  [AppCategory.UNKNOWN]: 'rgba(255,255,255,0.4)',
};

function fmt(ms: number): string {
  if (ms < 60_000) return '<1m';
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function CategoryEditor(): JSX.Element {
  const ui = useUI();
  const [apps, setApps] = useState<KnownApp[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [customApp, setCustomApp] = useState('');

  const load = async () => {
    setLoading(true);
    const list = await window.api.listKnownApps();
    setApps(list);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(() => {
    if (!filter.trim()) return apps;
    const q = filter.toLowerCase();
    return apps.filter((a) => a.app.toLowerCase().includes(q));
  }, [apps, filter]);

  const setCategory = async (app: string, cat: AppCategory) => {
    await window.api.setCategory(app, cat);
    setApps((cur) => cur.map((a) => (a.app === app ? { ...a, override: cat } : a)));
  };

  const addCustom = async () => {
    const name = customApp.trim();
    if (!name) return;
    await window.api.setCategory(name, AppCategory.FOCUS);
    setCustomApp('');
    void load();
  };

  return (
    <div className="h-full overflow-y-auto px-5 py-5 space-y-4" data-testid="screen-categories">
      <div className="flex items-center gap-2">
        <button
          className="btn-ghost btn !p-2"
          onClick={() => ui.setScreen('settings')}
          data-testid="btn-categories-back"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="font-display text-lg">App categories</div>
      </div>

      <div className="text-xs text-white/50 leading-relaxed">
        Override how FocusGhost classifies an app. Drives the drift-risk scorer and the FOCUS / DRIFT
        badges in your active session.
      </div>

      <div className="card !p-3 flex items-center gap-2">
        <Search size={14} className="text-white/40" />
        <input
          data-testid="categories-search"
          className="flex-1 bg-transparent outline-none text-sm placeholder-white/30"
          placeholder="Search apps…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="card !p-3 space-y-2">
        <div className="label">ADD APP</div>
        <div className="flex gap-2">
          <input
            data-testid="categories-add-input"
            className="flex-1 bg-ink-700 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-white/30"
            placeholder="e.g., Linear, Postman, Bear"
            value={customApp}
            onChange={(e) => setCustomApp(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
          />
          <button
            className="btn btn-primary !py-2"
            onClick={addCustom}
            disabled={!customApp.trim()}
            data-testid="categories-add-btn"
          >
            Add
          </button>
        </div>
        <div className="text-[11px] text-white/40">
          Added apps default to FOCUS — pick a category below to change.
        </div>
      </div>

      {loading ? (
        <div className="text-white/40 text-sm">Loading apps…</div>
      ) : visible.length === 0 ? (
        <div className="card text-sm text-white/50" data-testid="categories-empty">
          {filter ? 'No apps match that search.' : 'No apps tracked yet — run a session first.'}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((a) => (
            <AppRow key={a.app} app={a} onChange={(cat) => setCategory(a.app, cat)} />
          ))}
        </div>
      )}
    </div>
  );
}

function AppRow({ app, onChange }: { app: KnownApp; onChange: (cat: AppCategory) => void }) {
  const effective = app.override ?? app.defaultCategory;
  return (
    <div className="card !py-3 !px-3" data-testid={`category-row-${app.app}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="dot" style={{ background: CATEGORY_COLOR[effective] }} />
            <span className="text-sm truncate">{app.app}</span>
            {app.override && (
              <span className="pill !py-0.5 !px-2 !text-[9px] accent-bg-dim">CUSTOM</span>
            )}
          </div>
          <div className="text-[10px] text-white/40 mt-0.5">
            {app.appearances > 0 ? `${app.appearances} sessions · ${fmt(app.totalMs)}` : 'No history yet'}
          </div>
        </div>
      </div>
      <div className="flex gap-1 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            data-testid={`set-${app.app}-${c}`}
            onClick={() => onChange(c)}
            className={`pill border text-[10px] ${effective === c ? 'accent-bg-dim accent-border' : 'border-white/10 text-white/55'}`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
