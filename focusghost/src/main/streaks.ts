// Cross-session streak + aggregate computation from saved session records.
import type { KnownApp, SessionRecord, StreakInfo } from '../shared/types';
import { categorizeApp } from './appCategories';
import { getCategoryOverrides } from './persistence';

const QUALIFYING_FOCUS_MS = 10 * 60_000; // 10 min of focus to count as a "focused day"

function dateKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

function todayKey(): string {
  return dateKey(Date.now());
}

function dayBefore(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() - 1);
  return dateKey(date.getTime());
}

export function computeStreak(sessions: SessionRecord[]): StreakInfo {
  const qualifyingDays = new Set<string>();
  let totalFocusMs = 0;
  let totalSessions = 0;
  for (const s of sessions) {
    totalFocusMs += s.focusMs;
    if (s.focusMs >= QUALIFYING_FOCUS_MS) {
      qualifyingDays.add(dateKey(s.startedAt));
      totalSessions += 1;
    }
  }

  const today = todayKey();
  const todayHasSession = qualifyingDays.has(today);

  // Walk back from today (or yesterday) collecting consecutive days.
  let cursor = todayHasSession ? today : dayBefore(today);
  let current = 0;
  while (qualifyingDays.has(cursor)) {
    current += 1;
    cursor = dayBefore(cursor);
  }

  // Longest streak: walk all qualifying days sorted asc.
  const sorted = Array.from(qualifyingDays).sort();
  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    if (prev && dayBefore(day) === prev) run += 1;
    else run = 1;
    if (run > longest) longest = run;
    prev = day;
  }
  if (current > longest) longest = current;

  // Last 30 days that have qualifying session.
  const recentDays: string[] = [];
  let walker = today;
  for (let i = 0; i < 30; i += 1) {
    if (qualifyingDays.has(walker)) recentDays.push(walker);
    walker = dayBefore(walker);
  }

  return {
    current,
    longest,
    todayHasSession,
    recentDays,
    totalSessions,
    totalFocusMs,
  };
}

export function aggregateKnownApps(sessions: SessionRecord[]): KnownApp[] {
  const overrides = getCategoryOverrides();
  const map = new Map<string, { totalMs: number; appearances: number }>();
  for (const s of sessions) {
    for (const [app, e] of Object.entries(s.appTimeMap)) {
      const cur = map.get(app) ?? { totalMs: 0, appearances: 0 };
      cur.totalMs += e.totalMs;
      cur.appearances += 1;
      map.set(app, cur);
    }
  }
  const out: KnownApp[] = [];
  for (const [app, agg] of map.entries()) {
    out.push({
      app,
      totalMs: agg.totalMs,
      appearances: agg.appearances,
      defaultCategory: categorizeApp(app, {}),
      override: overrides[app],
    });
  }
  // also include apps that have only an override but no session history yet
  for (const app of Object.keys(overrides)) {
    if (!map.has(app)) {
      out.push({
        app,
        totalMs: 0,
        appearances: 0,
        defaultCategory: categorizeApp(app, {}),
        override: overrides[app],
      });
    }
  }
  out.sort((a, b) => b.totalMs - a.totalMs);
  return out;
}
