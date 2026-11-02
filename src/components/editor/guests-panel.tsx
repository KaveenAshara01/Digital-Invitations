'use client';
import { useEffect, useState } from 'react';
type Guest = { id: string; name: string; email: string | null; partySize: number; token: string; response: string; attending: number; note: string };
export function GuestsPanel({ id }: { id: string }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [partySize, setPartySize] = useState(1);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [loaded, setLoaded] = useState(false); const [message, setMessage] = useState('');
  const url = `/api/invitations/${id}/guests`;
  async function load() { const response = await fetch(url, { cache: 'no-store' }); const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? 'Unable to load guests.'); setGuests(body.data); setLoaded(true); }
  useEffect(() => { void load().catch(error => setError(error.message)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
  async function mutate(method: string, data: unknown) {
    setBusy(true); setError(''); setMessage('');
    try { const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); const body = await response.json(); if (!response.ok) throw new Error(body.error?.message ?? 'Unable to update guests.'); if (method === 'POST') { setName(''); setEmail(''); setPartySize(1); } await load(); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to update guests.'); } finally { setBusy(false); }
  }
  async function copy(token: string) { try { await navigator.clipboard.writeText(new URL(`/rsvp/${token}`, window.location.origin).href); setMessage('Guest link copied.'); } catch { setError('Open the guest link and copy its address.'); } }
  return <div><h2 className="serif text-2xl">Your guest list</h2><p className="my-4 text-sm">Each guest has a private RSVP link. Publish with the RSVP section enabled before sharing. Deleting a guest or replacing their link revokes the old link.</p>
    {loaded && <p className="my-4 text-sm" aria-live="polite">{guests.length} parties · {guests.filter(g => g.response === 'PENDING').length} pending · {guests.filter(g => g.response === 'ACCEPTED').length} accepted · {guests.filter(g => g.response === 'DECLINED').length} declined · {guests.reduce((sum, g) => sum + g.attending, 0)} attending</p>}
    <label className="editor-label">Guest name<input className="field" value={name} maxLength={120} onChange={e => setName(e.target.value)}/></label>
    <label className="editor-label">Email (optional)<input className="field" type="email" value={email} maxLength={254} onChange={e => setEmail(e.target.value)}/></label>
    <label className="editor-label">Maximum party size<input className="field" type="number" min={1} max={20} value={partySize} onChange={e => setPartySize(Number(e.target.value))}/></label>
    <button type="button" className="button" disabled={busy || !name.trim() || !Number.isInteger(partySize) || partySize < 1 || partySize > 20 || (!!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))} onClick={() => void mutate('POST', { name, email, partySize })}>Add guest</button>
    <a className="my-4 block text-sm underline" href={`${url}?format=csv`}>Export guest responses (CSV)</a>
    {!loaded && !error && <p role="status">Loading guests…</p>}
    {guests.map(guest => <div key={guest.id} className="my-4 rounded-xl border border-ink/20 p-4"><h3>{guest.name}</h3><p className="text-sm">{guest.response.toLowerCase()} · {guest.attending}/{guest.partySize} attending</p>{guest.note && <p className="my-2 whitespace-pre-wrap text-sm">{guest.note}</p>}<div className="mt-3 flex flex-wrap gap-3 text-sm underline"><a href={`/rsvp/${guest.token}`} target="_blank" rel="noopener noreferrer">Open RSVP</a><button type="button" onClick={() => void copy(guest.token)}>Copy link</button><button type="button" disabled={busy} onClick={() => void mutate('PATCH', { guestId: guest.id })}>Replace link</button><button type="button" disabled={busy} onClick={() => { if (window.confirm(`Delete ${guest.name} and their response?`)) void mutate('DELETE', { guestId: guest.id }); }}>Delete</button></div></div>)}
    {message && <p role="status">{message}</p>}{error && <div role="alert"><p>{error}</p><button type="button" onClick={() => void load().then(() => setError('')).catch(error => setError(error.message))}>Retry loading guests</button></div>}
  </div>;
}
