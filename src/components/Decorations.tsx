import { useMemo } from 'react';

const STAR_CHARS = ['✦', '✧', '⋆', '✶', '✴'];
const HEART_CHARS = ['♡', '♥', '❤'];

interface Particle { id: number; char: string; x: number; y: number; size: number; dur: number; delay: number; }

function make(count: number, chars: string[], minSz: number, maxSz: number, minD: number, maxD: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i, char: chars[i % chars.length],
    x: Math.random() * 100, y: Math.random() * 100,
    size: minSz + Math.random() * (maxSz - minSz),
    dur: minD + Math.random() * (maxD - minD),
    delay: Math.random() * maxD,
  }));
}

export function BackgroundParticles() {
  const stars = useMemo(() => make(18, STAR_CHARS, 10, 20, 1.5, 4), []);
  const hearts = useMemo(() => make(8, HEART_CHARS, 12, 18, 2.5, 5), []);
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden>
      {stars.map(s => (
        <span key={`s${s.id}`} className="star absolute"
          style={{ left: `${s.x}%`, top: `${s.y}%`, fontSize: s.size, '--dur': `${s.dur}s`, '--delay': `${s.delay}s` } as React.CSSProperties}
        >{s.char}</span>
      ))}
      {hearts.map(h => (
        <span key={`h${h.id}`} className="float-dot absolute text-rose-light/40"
          style={{ left: `${h.x}%`, top: `${h.y}%`, fontSize: h.size, '--dur': `${h.dur}s`, '--delay': `${h.delay}s` } as React.CSSProperties}
        >{h.char}</span>
      ))}
    </div>
  );
}
