// Top window chrome — drag region + tabs + window controls.
import React from 'react';
import { Settings, Minimize2, Eye, EyeOff } from 'lucide-react';
import { useUI } from '../store';
import type { Screen } from '../store';

export default function Header(): JSX.Element {
  const ui = useUI();

  const tabs: Array<{ id: Screen; label: string; testId: string }> = [
    { id: 'task', label: 'Task', testId: 'tab-task' },
    { id: 'active', label: 'Session', testId: 'tab-active' },
    { id: 'chat', label: 'Chat', testId: 'tab-chat' },
    { id: 'recap', label: 'Recap', testId: 'tab-recap' },
    { id: 'history', label: 'History', testId: 'tab-history' },
  ];

  const cycleOpacity = async () => {
    const cur = ui.settings.opacity;
    const next = cur > 0.85 ? 0.75 : cur > 0.6 ? 0.45 : 1;
    await window.api.updateSettings({ opacity: next });
    await window.api.setOpacity(next);
  };

  return (
    <div className="drag flex items-center justify-between px-4 py-2 border-b border-white/5">
      <div className="flex items-center gap-3 no-drag">
        <div className="w-2 h-2 rounded-full accent-bg" />
        <span className="text-sm font-display tracking-wide">FocusGhost</span>
      </div>
      <div className="no-drag flex items-center gap-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            data-testid={t.testId}
            onClick={() => ui.setScreen(t.id)}
            className={`btn-ghost btn !py-1.5 !px-3 text-xs ${ui.screen === t.id ? 'accent-text' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="no-drag flex items-center gap-1">
        <button
          data-testid="btn-opacity"
          className="btn-ghost btn !p-2"
          onClick={cycleOpacity}
          title="Cycle opacity"
        >
          {ui.settings.opacity < 0.7 ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          data-testid="btn-collapse"
          className="btn-ghost btn !p-2"
          onClick={() => window.api.toggleCollapsed()}
          title="Collapse"
        >
          <Minimize2 size={14} />
        </button>
        <button
          data-testid="btn-settings"
          className="btn-ghost btn !p-2"
          onClick={() => ui.setScreen('settings')}
          title="Settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </div>
  );
}
