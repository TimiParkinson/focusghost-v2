// Screen 01 - Task Declaration. User types task name, picks duration, starts session.
import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import Ghost from '../components/Ghost';
import { useUI } from '../store';

const DURATIONS = [15, 30, 45, 60];

export default function TaskDeclaration(): JSX.Element {
  const ui = useUI();
  const [task, setTask] = useState('');
  const [duration, setDuration] = useState(ui.settings.defaultDurationMin || 15);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDuration(ui.settings.defaultDurationMin || 15);
  }, [ui.settings.defaultDurationMin]);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(
        containerRef.current.children,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.07, ease: 'power3.out' },
      );
    }
    inputRef.current?.focus();
  }, []);

  const start = async () => {
    if (!task.trim()) return;
    ui.resetChat();
    await window.api.sessionStart({ taskName: task.trim(), durationMin: duration, startedAt: Date.now() });
    ui.setScreen('active');
  };

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 py-6 gap-6" ref={containerRef} data-testid="screen-task">
      <Ghost size={120} />
      <div className="text-center">
        <div className="label">FOCUS SESSION</div>
        <div className="font-display text-2xl mt-1">What are you working on?</div>
      </div>
      <input
        ref={inputRef}
        data-testid="input-task"
        className="w-full max-w-sm bg-ink-700 border border-white/10 rounded-lg px-4 py-3 text-base outline-none focus:accent-border focus:border-2"
        placeholder="e.g., refactor session machine"
        value={task}
        onChange={(e) => setTask(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && task.trim()) void start();
        }}
      />
      <div className="flex gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d}
            data-testid={`duration-${d}`}
            onClick={() => setDuration(d)}
            className={`pill border ${duration === d ? 'accent-bg-dim accent-border' : 'border-white/10 text-white/60 hover:text-white'}`}
          >
            {d}m
          </button>
        ))}
      </div>
      <button
        data-testid="btn-start-session"
        className="btn btn-primary !px-8 !py-3"
        disabled={!task.trim()}
        onClick={start}
      >
        Start focus session
      </button>
      <div className="text-xs text-white/40">↵ to start</div>
    </div>
  );
}
