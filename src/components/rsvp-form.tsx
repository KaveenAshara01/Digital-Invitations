'use client';
import { useState } from 'react';
export function RsvpForm({ token, name, partySize, initialResponse, initialAttending, initialNote }: { token: string; name: string; partySize: number; initialResponse: string; initialAttending: number; initialNote: string }) {
  const [response, setResponse] = useState(initialResponse === 'DECLINED' ? 'DECLINED' : 'ACCEPTED');
  const [attending, setAttending] = useState(initialAttending || 1); const [note, setNote] = useState(initialNote); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState(false);
  return <form className="mx-auto my-8 max-w-xl rounded-xl border border-ink/20 p-6" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError(''); setSaved(false);
    try { const result = await fetch(`/api/rsvp/${token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response, attending: response === 'DECLINED' ? 0 : attending, note }) }); const body = await result.json(); if (!result.ok) throw new Error(body.error?.message ?? 'Unable to save your response.'); setSaved(true); }
    catch (error) { setError(error instanceof Error ? error.message : 'Please try again.'); } finally { setBusy(false); }
  }}><h1 className="serif text-3xl">RSVP for {name}</h1><fieldset disabled={busy}><label className="editor-label">Will you join us?<select className="field" value={response} onChange={e => { setResponse(e.target.value); setSaved(false); }}><option value="ACCEPTED">Joyfully accepts</option><option value="DECLINED">Regretfully declines</option></select></label>
    {response === 'ACCEPTED' && <label className="editor-label">Guests attending (up to {partySize})<input className="field" type="number" required min={1} max={partySize} value={attending} onChange={e => { setAttending(Number(e.target.value)); setSaved(false); }}/></label>}
    <label className="editor-label">Message or dietary requirements<textarea className="field" maxLength={500} value={note} onChange={e => { setNote(e.target.value); setSaved(false); }}/></label><button className="button">{busy ? 'Saving…' : 'Save RSVP'}</button></fieldset>
    {saved && <p role="status" className="mt-4">Thank you. Your response has been saved. You can update it using this link.</p>}{error && <p role="alert" className="mt-4">{error}</p>}
  </form>;
}
