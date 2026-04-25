// App shell — wires IPC subscriptions, picks the active screen, renders chrome.
import React, { useEffect } from 'react';
import { useUI } from './store';
import TaskDeclaration from './screens/TaskDeclaration';
import ActiveSession from './screens/ActiveSession';
import GhostChat from './screens/GhostChat';
import Recap from './screens/Recap';
import Settings from './screens/Settings';
import CollapsedBar from './components/CollapsedBar';
import Header from './components/Header';
import { applyAccentClass } from './api';
import { SessionState } from '../shared/types';

export default function App(): JSX.Element {
  const ui = useUI();

  // Subscribe to all main-process events on mount.
  useEffect(() => {
    const offs: Array<() => void> = [];
    offs.push(window.api.onSessionState((s) => ui.setState(s)));
    offs.push(window.api.onStatsUpdate((s) => ui.setStats(s)));
    offs.push(
      window.api.onSessionRecap((r) => {
        ui.setRecap(r);
      }),
    );
    offs.push(
      window.api.onNudge((n) => {
        ui.setPendingNudge(n);
        ui.appendChat({ id: n.id, variant: 'nudge', text: n.text, timestamp: Date.now(), meta: { reason: n.reason } });
      }),
    );
    offs.push(
      window.api.onStuckActivate((p) => {
        ui.setPendingStuck(p);
        ui.setScreen('chat');
      }),
    );
    offs.push(
      window.api.onChatReply((m) => {
        ui.appendChat(m);
        ui.setChatBusy(false);
      }),
    );
    offs.push(
      window.api.onStuckResponse((m) => {
        ui.appendChat(m);
        ui.setChatBusy(false);
      }),
    );
    offs.push(window.api.onPatternNotice((p) => ui.addPattern(p)));
    offs.push(
      window.api.onSettingsChanged((s) => {
        ui.setSettings(s);
        applyAccentClass(s.accent);
      }),
    );
    offs.push(window.api.onCollapsedState((c) => ui.setCollapsed(c)));
    void window.api.getSettings().then((s) => {
      ui.setSettings(s);
      applyAccentClass(s.accent);
    });
    return () => offs.forEach((o) => o());
  }, []);

  // Auto-route based on session state.
  useEffect(() => {
    if (ui.state === SessionState.RECAP && ui.screen !== 'settings') ui.setScreen('recap');
  }, [ui.state]);

  if (ui.collapsed) return <CollapsedBar />;

  return (
    <div className="h-screen w-screen p-3" data-testid="app-root">
      <div className="shell h-full flex flex-col">
        <Header />
        <div className="flex-1 overflow-hidden">
          {ui.screen === 'task' && <TaskDeclaration />}
          {ui.screen === 'active' && <ActiveSession />}
          {ui.screen === 'chat' && <GhostChat />}
          {ui.screen === 'recap' && <Recap />}
          {ui.screen === 'settings' && <Settings />}
        </div>
      </div>
    </div>
  );
}
