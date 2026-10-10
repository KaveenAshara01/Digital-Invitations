'use client';
import { useEffect, useState } from 'react';
import { eventInstant } from '@/lib/templates/time';
export function Countdown({ dateTime, timeZone }: { dateTime: string; timeZone: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const target = eventInstant({ dateTime, timeZone });
  if (target === null || now === null) return null;
  const seconds = Math.floor(Math.max(0, target - now) / 1000);
  if (seconds === 0) return <p className="inv-countdown-note">The day has arrived.</p>;
  const values = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24, Math.floor(seconds / 60) % 60];
  return <div className="inv-countdown" aria-label="Time until the celebration">{values.map((value, index) => <div key={index}><span>{String(value).padStart(2, '0')}</span><small>{['days', 'hours', 'minutes'][index]}</small></div>)}</div>;
}
