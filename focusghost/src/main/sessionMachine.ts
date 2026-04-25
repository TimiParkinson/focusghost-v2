// Session finite-state machine: IDLE ↔ ACTIVE ↔ DRIFTING ↔ INACTIVE → RECAP.
import { EventEmitter } from 'node:events';
import { SessionState } from '../shared/types';

export type Trigger =
  | { type: 'START' }
  | { type: 'END' }
  | { type: 'RESET' }
  | { type: 'FOCUS' }
  | { type: 'DRIFT' }
  | { type: 'INACTIVE' }
  | { type: 'TIMEOUT' };

export class SessionMachine extends EventEmitter {
  private _state: SessionState = SessionState.IDLE;

  get state(): SessionState {
    return this._state;
  }

  send(trigger: Trigger): SessionState {
    const from = this._state;
    const next = this.transition(from, trigger);
    if (next !== from) {
      this._state = next;
      this.emit('change', next, from);
    }
    return this._state;
  }

  private transition(from: SessionState, t: Trigger): SessionState {
    if (t.type === 'RESET') return SessionState.IDLE;
    if (t.type === 'TIMEOUT' && from !== SessionState.IDLE) return SessionState.RECAP;

    switch (from) {
      case SessionState.IDLE:
        if (t.type === 'START') return SessionState.ACTIVE;
        return from;
      case SessionState.ACTIVE:
        if (t.type === 'DRIFT') return SessionState.DRIFTING;
        if (t.type === 'INACTIVE') return SessionState.INACTIVE;
        if (t.type === 'END') return SessionState.RECAP;
        return from;
      case SessionState.DRIFTING:
        if (t.type === 'FOCUS') return SessionState.ACTIVE;
        if (t.type === 'INACTIVE') return SessionState.INACTIVE;
        if (t.type === 'END') return SessionState.RECAP;
        return from;
      case SessionState.INACTIVE:
        if (t.type === 'FOCUS') return SessionState.ACTIVE;
        if (t.type === 'DRIFT') return SessionState.DRIFTING;
        if (t.type === 'END') return SessionState.RECAP;
        return from;
      case SessionState.RECAP:
        if (t.type === 'START') return SessionState.ACTIVE;
        return from;
      default:
        return from;
    }
  }
}
