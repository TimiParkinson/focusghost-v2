// Ghost mascot — animated SVG with state-driven expression. Uses GSAP for entrance.
import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { SessionState } from '../../shared/types';

interface Props {
  state?: SessionState;
  size?: number;
  drifting?: boolean;
}

export default function Ghost({ state = SessionState.IDLE, size = 96, drifting = false }: Props): JSX.Element {
  const ref = useRef<SVGSVGElement>(null);
  const eyesRef = useRef<SVGGElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const tl = gsap.timeline();
    tl.fromTo(
      ref.current,
      { y: 16, opacity: 0, scale: 0.92 },
      { y: 0, opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.6)' },
    );
    // soft float loop
    gsap.to(ref.current, {
      y: '-=6',
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      delay: 0.5,
    });
    return () => {
      gsap.killTweensOf(ref.current);
    };
  }, []);

  // blink loop
  useEffect(() => {
    if (!eyesRef.current) return;
    const blink = () => gsap.to(eyesRef.current, { scaleY: 0.1, duration: 0.08, yoyo: true, repeat: 1, transformOrigin: 'center' });
    const id = setInterval(blink, 4200);
    return () => clearInterval(id);
  }, []);

  const drift = drifting || state === SessionState.DRIFTING;
  const stuck = state === SessionState.INACTIVE;
  const fill = drift ? '#FF6B7A' : stuck ? '#F59E0B' : 'var(--accent)';
  const eyeY = drift ? 44 : 42;

  return (
    <svg
      ref={ref}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      data-testid="ghost-mascot"
      className="drop-shadow-[0_8px_28px_rgba(0,212,212,0.25)]"
    >
      <defs>
        <radialGradient id="ghostBody" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor={fill} stopOpacity="1" />
          <stop offset="100%" stopColor={fill} stopOpacity="0.65" />
        </radialGradient>
      </defs>
      {/* body */}
      <path
        d="M50 10
           C72 10 80 28 80 48
           L80 82
           C80 86 76 88 73 86
           L66 80
           C63 78 60 80 58 82
           L54 86
           C52 88 48 88 46 86
           L42 82
           C40 80 37 78 34 80
           L27 86
           C24 88 20 86 20 82
           L20 48
           C20 28 28 10 50 10 Z"
        fill="url(#ghostBody)"
      />
      {/* eyes */}
      <g ref={eyesRef}>
        <ellipse cx="40" cy={eyeY} rx="4" ry={drift ? 3 : 5} fill="#0B1014" />
        <ellipse cx="60" cy={eyeY} rx="4" ry={drift ? 3 : 5} fill="#0B1014" />
      </g>
      {/* mouth */}
      {drift ? (
        <path d="M42 60 Q50 54 58 60" stroke="#0B1014" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : stuck ? (
        <line x1="44" y1="60" x2="56" y2="60" stroke="#0B1014" strokeWidth="2.5" strokeLinecap="round" />
      ) : (
        <path d="M42 58 Q50 66 58 58" stroke="#0B1014" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
      {/* cheek dots */}
      <circle cx="32" cy="55" r="2" fill="rgba(255,255,255,0.18)" />
      <circle cx="68" cy="55" r="2" fill="rgba(255,255,255,0.18)" />
    </svg>
  );
}
