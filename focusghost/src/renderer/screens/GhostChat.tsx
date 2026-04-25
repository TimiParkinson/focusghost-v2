// Screen 03 - Ghost Chat panel. Full session chat log + stuck card + freeform input.
import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useUI } from '../store';
import ChatMessageView from '../components/ChatMessage';
import StuckCard from '../components/StuckCard';

export default function GhostChat(): JSX.Element {
  const ui = useUI();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [ui.chat.length, ui.pendingStuck, ui.chatInputBusy]);

  const send = async () => {
    if (!text.trim() || ui.chatInputBusy) return;
    const out = text.trim();
    ui.appendChat({ id: `u_${Date.now()}`, variant: 'user', text: out, timestamp: Date.now() });
    setText('');
    ui.setChatBusy(true);
    try {
      await window.api.sendChat(out);
    } finally {
      // reply event flips busy off, but guard:
      setTimeout(() => ui.setChatBusy(false), 100);
    }
  };

  const ack = (accept: boolean) => {
    if (!ui.pendingNudge) return;
    ui.appendChat({
      id: `ack_${Date.now()}`,
      variant: 'system',
      text: accept ? 'Accepted nudge — back on it.' : 'Dismissed nudge.',
      timestamp: Date.now(),
    });
    ui.setPendingNudge(null);
  };

  return (
    <div className="h-full flex flex-col" data-testid="screen-chat">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {ui.pendingStuck && <StuckCard />}
        {ui.chat.length === 0 && !ui.pendingStuck && (
          <div className="text-center text-white/40 text-sm pt-12" data-testid="chat-empty">
            Ghost is here. Ask anything, or start a session to get nudges.
          </div>
        )}
        {ui.chat.map((m) => (
          <ChatMessageView
            key={m.id}
            msg={m}
            onAccept={m.variant === 'nudge' && ui.pendingNudge?.id === m.id ? () => ack(true) : undefined}
            onDismiss={m.variant === 'nudge' && ui.pendingNudge?.id === m.id ? () => ack(false) : undefined}
          />
        ))}
        {ui.chatInputBusy && (
          <div className="text-xs text-white/40" data-testid="chat-loading">
            Ghost is thinking…
          </div>
        )}
      </div>
      <div className="border-t border-white/5 p-3 flex gap-2">
        <input
          data-testid="chat-input"
          className="flex-1 bg-ink-700 border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-white/30"
          placeholder="Talk to your ghost…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          disabled={ui.chatInputBusy}
        />
        <button
          className="btn btn-primary !p-2"
          data-testid="btn-chat-send"
          onClick={send}
          disabled={!text.trim() || ui.chatInputBusy}
        >
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}
