import type { InvitationConfig } from '@/lib/validation/invitation';
import { eventDateLabel } from '@/lib/templates/time';

export function KandyanLotus({ className = '' }: { className?: string }) {
  return <svg className={`kandyan-lotus ${className}`} viewBox="0 0 240 110" fill="none" aria-hidden="true"><g stroke="currentColor" strokeWidth="1.3"><path d="M120 96C78 65 101 24 120 8c19 16 42 57 0 88Z"/><path d="M120 96C72 99 42 67 45 35c36 1 67 19 75 61Zm0 0c48 3 78-29 75-61-36 1-67 19-75 61Z"/><path d="M120 96C65 114 26 96 13 68c40-12 78-4 107 28Zm0 0c55 18 94 0 107-28-40-12-78-4-107 28Z"/><path d="M30 104h180"/></g></svg>;
}

export function KandyanHero({ config }: { config: InvitationConfig }) {
  return <header className="inv-hero hero-kandyan">
    <div className="kandyan-arch" aria-hidden="true"/>
    <KandyanLotus/>
    <p className="kandyan-blessing" lang="si">ශ්‍රී සුබ මංගලම්</p>
    <p className="inv-eyebrow">{config.greeting}</p>
    <h2 className="inv-hosts" style={{ fontSize: `calc(clamp(2.6rem, 7vw, 4.5rem) * ${config.theme.headingScale})` }}>{config.hosts}</h2>
    <p className="inv-event-title">{config.eventTitle}</p>
    <div className="kandyan-date"><span aria-hidden="true">✦</span><p className="inv-date">{eventDateLabel(config.dateTime)}</p><span aria-hidden="true">✦</span></div>
    <img className="kandyan-couple" src="/templates/kandyan/couple.png" alt="Illustration of a Sri Lankan bride and groom in traditional Kandyan wedding attire" width="1536" height="1024" decoding="async"/>
    <p className="inv-small kandyan-venue">{config.venue || 'A beautiful celebration awaits'}</p>
    <p className="kandyan-scroll">Our forever begins here <span aria-hidden="true">↓</span></p>
  </header>;
}
