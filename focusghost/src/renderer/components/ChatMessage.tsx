// Single chat message bubble. Variant decides styling (ghost / user / nudge / pattern / stuck).
import React from 'react';
import type { ChatMessage } from '../../shared/types';
import Ghost from './Ghost';

interface Props {
  msg: ChatMessage;
  onAccept?: () => void;
  onDismiss?: () => void;
}

function timeStr(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ChatMessageView({ msg, onAccept, onDismiss }: Props): JSX.Element {
  if (msg.variant === 'user') {
    return (
      <div className="flex justify-end" data-testid={`msg-${msg.id}`}>
        <div className="max-w-[78%] card !p-3 accent-bg-dim">
          <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
          <div className="text-[10px] mt-1 opacity-70">{timeStr(msg.timestamp)}</div>
        </div>
      </div>
    );
  }
  if (msg.variant === 'pattern') {
    return (
      <div className="card border-l-2" style={{ borderLeftColor: '#F59E0B' }} data-testid={`msg-${msg.id}`}>
        <div className="label" style={{ color: '#F59E0B' }}>
          PATTERN NOTICED
        </div>
        <div className="text-sm mt-1 whitespace-pre-wrap">{msg.text}</div>
        <div className="text-[10px] mt-1 opacity-70">{timeStr(msg.timestamp)}</div>
      </div>
    );
  }
  if (msg.variant === 'stuck-prompt') {
    return (
      <div className="flex justify-end" data-testid={`msg-${msg.id}`}>
        <div className="max-w-[78%] card !p-3" style={{ borderColor: '#F59E0B' }}>
          <div className="label" style={{ color: '#F59E0B' }}>
            YOU SAID
          </div>
          <div className="text-sm mt-1 whitespace-pre-wrap">{msg.text}</div>
        </div>
      </div>
    );
  }
  if (msg.variant === 'stuck-response') {
    return (
      <div className="flex gap-2 items-start" data-testid={`msg-${msg.id}`}>
        <Ghost size={32} />
        <div className="card flex-1" style={{ borderColor: '#F59E0B' }}>
          <div className="label" style={{ color: '#F59E0B' }}>
            UNSTUCK SUGGESTION
          </div>
          <pre className="text-sm mt-2 whitespace-pre-wrap font-sans leading-relaxed">{msg.text}</pre>
          <div className="flex gap-2 mt-3">
            <button className="btn !py-1.5" data-testid="btn-stuck-helped">
              Yes, helped
            </button>
            <button className="btn-ghost btn !py-1.5" data-testid="btn-stuck-still">
              Still stuck
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (msg.variant === 'nudge') {
    return (
      <div className="flex gap-2 items-start" data-testid={`msg-${msg.id}`}>
        <Ghost size={32} />
        <div className="card flex-1 accent-border" style={{ borderWidth: 1 }}>
          <div className="label accent-text">NUDGE</div>
          <div className="text-sm mt-1 whitespace-pre-wrap">{msg.text}</div>
          {(onAccept || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onAccept && (
                <button className="btn btn-primary !py-1.5" onClick={onAccept} data-testid="btn-nudge-accept">
                  On it
                </button>
              )}
              {onDismiss && (
                <button className="btn-ghost btn !py-1.5" onClick={onDismiss} data-testid="btn-nudge-dismiss">
                  Not now
                </button>
              )}
            </div>
          )}
          <div className="text-[10px] mt-2 opacity-70">{timeStr(msg.timestamp)}</div>
        </div>
      </div>
    );
  }
  // default ghost / system / insight
  return (
    <div className="flex gap-2 items-start" data-testid={`msg-${msg.id}`}>
      <Ghost size={32} />
      <div className="card flex-1">
        <div className="text-sm whitespace-pre-wrap">{msg.text}</div>
        <div className="text-[10px] mt-1 opacity-70">{timeStr(msg.timestamp)}</div>
      </div>
    </div>
  );
}
