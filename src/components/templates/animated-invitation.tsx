'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { TemplateDefinition } from '@/lib/templates/registry';

export function AnimatedInvitation({ children, kind }: { children: React.ReactNode; kind: TemplateDefinition['kind'] }) {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [replay, setReplay] = useState(0);
  useEffect(() => {
    const preference = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference?.matches ?? false);
    update(); preference?.addEventListener('change', update);
    if (typeof IntersectionObserver === 'undefined') return () => preference?.removeEventListener('change', update);
    const observer = new IntersectionObserver(entries => setOffscreen(!entries[0].isIntersecting), { threshold: 0 });
    if (root.current) observer.observe(root.current);
    return () => { observer.disconnect(); preference?.removeEventListener('change', update); };
  }, []);
  const stopped = paused || reduced;
  return <div ref={root} className={`animated-invitation ${stopped ? 'motion-stopped' : ''} ${offscreen ? 'motion-offscreen' : ''}`}>
    <div className="inv-motion-controls"><span>{reduced ? 'Reduced motion' : 'Animated invitation'}</span><div><button type="button" aria-pressed={paused} disabled={reduced} onClick={() => setPaused(value => !value)}>{paused ? 'Play animations' : 'Pause animations'}</button><button type="button" disabled={stopped} onClick={() => setReplay(value => value + 1)}>Replay animations</button></div></div>
    <div key={replay} className={`inv-motion-scene motion-${kind}`}>
      <div className="ambient-decoration" aria-hidden="true">{Array.from({ length: kind === 'minimal' ? 3 : 10 }, (_, index) => <i key={index} style={{ '--particle-x': `${5 + (index * 37) % 90}%`, '--particle-delay': `${-index * 1.7}s`, '--particle-duration': `${12 + (index % 5) * 3}s`, '--particle-turn': `${index * 29}deg` } as CSSProperties}/>)}</div>
      {children}
    </div>
  </div>;
}
