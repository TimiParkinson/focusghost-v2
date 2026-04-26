// Window-mode store + helpers — renderer-side mirror of WindowController state.
import { writable } from 'svelte/store';
import type { WindowMode } from '../shared/ipc';

export const windowMode = writable<WindowMode>('panel');
export const isPanelPinned = writable<boolean>(false);

/** Pure surface kind based on the URL ?surface= query parameter. */
export type Surface = 'panel' | 'nudge';

export function readSurface(): Surface {
  const params = new URLSearchParams(window.location.search);
  const s = params.get('surface');
  if (s === 'nudge' || s === 'panel') return s;
  return 'panel';
}
