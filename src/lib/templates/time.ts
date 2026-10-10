import type { InvitationConfig } from '@/lib/validation/invitation';
// Convert the editor's wall-clock date into an instant in its explicitly chosen zone.
export function eventInstant(config: Pick<InvitationConfig, 'dateTime' | 'timeZone'>): number | null {
  if (!config.dateTime) return null;
  const parts = config.dateTime.split(/[-T:]/).map(Number);
  const desired = Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4]);
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: config.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  let instant = desired;
  for (let i = 0; i < 4; i++) {
    const rendered = Object.fromEntries(formatter.formatToParts(instant).map(p => [p.type, p.value]));
    const wallClock = Date.UTC(+rendered.year, +rendered.month - 1, +rendered.day, +rendered.hour, +rendered.minute);
    if (wallClock === desired) return instant;
    instant += desired - wallClock;
  }
  return null; // A nonexistent local time during a daylight-saving transition.
}
export function eventDateLabel(value: string) {
  if (!value || Number.isNaN(new Date(`${value}:00Z`).getTime())) return 'Date to be announced';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}:00Z`));
}
export function eventTimeLabel(value: string) {
  if (!value || Number.isNaN(new Date(`${value}:00Z`).getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(new Date(`${value}:00Z`));
}
