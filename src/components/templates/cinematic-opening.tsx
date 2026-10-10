'use client';
import { useState } from 'react';
export function CinematicOpening({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const revealed = !enabled || open;
  return <div className={`cinematic-stage ${revealed ? 'is-open' : ''}`}>
    <div aria-hidden={!revealed} inert={!revealed} className="cinematic-content">{children}</div>
    {enabled && <div className="cinematic-cover" aria-hidden={revealed} inert={revealed}><div aria-hidden="true" className="door door-left"/><div aria-hidden="true" className="door door-right"/><div className="door-invitation"><p className="inv-eyebrow">A beautiful beginning awaits</p><p className="serif text-4xl">You’re invited.</p><button type="button" className="inv-link" onClick={() => setOpen(true)}>Open the invitation <span aria-hidden="true">↗</span></button></div><button type="button" className="door-skip" onClick={() => setOpen(true)}>Skip opening</button></div>}
    {enabled && revealed && <button type="button" className="replay-opening" onClick={() => setOpen(false)}>Replay opening</button>}
  </div>;
}
