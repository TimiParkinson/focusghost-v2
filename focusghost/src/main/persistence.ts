// electron-store wrapper: sessions, settings, and app category overrides.
import Store from 'electron-store';
import type { AppCategory, AppSettings, SessionRecord } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/presets';

interface Schema {
  settings: AppSettings;
  sessions: SessionRecord[];
  appCategories: Record<string, AppCategory>;
}

const store = new Store<Schema>({
  name: 'focusghost',
  defaults: {
    settings: DEFAULT_SETTINGS,
    sessions: [],
    appCategories: {},
  },
});

export function getSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS, ...(store.get('settings') as AppSettings) };
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch };
  store.set('settings', next);
  return next;
}

export function saveSession(record: SessionRecord): void {
  const sessions = store.get('sessions') ?? [];
  sessions.unshift(record);
  // cap retention to 200 sessions
  store.set('sessions', sessions.slice(0, 200));
}

export function loadSessions(): SessionRecord[] {
  return store.get('sessions') ?? [];
}

export function getCategoryOverrides(): Record<string, AppCategory> {
  return store.get('appCategories') ?? {};
}

export function setCategoryOverride(appName: string, category: AppCategory): void {
  const overrides = getCategoryOverrides();
  overrides[appName] = category;
  store.set('appCategories', overrides);
}

export function getStorePath(): string {
  return store.path;
}
