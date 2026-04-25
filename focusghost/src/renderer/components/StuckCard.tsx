// Stuck Mode card overlay — shown in chat when stuck:activate fires.
import React, { useState } from 'react';
import { useUI } from '../store';
import { AlertTriangle } from 'lucide-react';

export default function StuckCard(): JSX.Element | null {
  const ui = useUI();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  if (!ui.pendingStuck) return null;

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    ui.appendChat({ id: `sp_${Date.now()}`, variant: 'stuck-prompt', text, timestamp: Date.now() });
    await window.api.submitStuck(text);
    setText('');
    setBusy(false);
    ui.setPendingStuck(null);
  };

  return (
    <div
      className="card mb-3"
      data-testid="stuck-card"
      style={{ borderColor: '#F59E0B', borderWidth: 1 }}
    >
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={16} color="#F59E0B" />
        <div className="label" style={{ color: '#F59E0B' }}>
          NOTICED YOU&apos;VE BEEN ON THE SAME PROBLEM FOR A WHILE
        </div>
      </div>
      <div className="text-sm mb-3">What are you having trouble with?</div>
      <input
        data-testid="stuck-input"
        className="w-full bg-ink-700 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-white/30"
        placeholder="e.g., understanding recursion in this function"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        disabled={busy}
      />
      <div className="flex gap-2 mt-3">
        <button
          className="btn btn-primary !py-1.5"
          onClick={submit}
          disabled={busy || !text.trim()}
          data-testid="btn-stuck-submit"
        >
          {busy ? 'Thinking…' : 'Get Unstuck Suggestion'}
        </button>
        <button
          className="btn-ghost btn !py-1.5"
          onClick={() => ui.setPendingStuck(null)}
          data-testid="btn-stuck-cancel"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
