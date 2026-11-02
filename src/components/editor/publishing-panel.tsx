'use client';
import { useEffect, useState } from 'react';
type Status = { url: string | null; publication: { id: string; revision: number; createdAt: string } | null };
export function PublishingPanel({ id, revision, mediaIds, disabled }: { id: string; revision: number; mediaIds: string[]; disabled: boolean }) {
  const [status, setStatus] = useState<Status>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  async function request(method: string) {
    const response = await fetch(`/api/invitations/${id}/publish`, { method, cache: 'no-store', ...(method === 'POST' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ revision, mediaIds }) } : {}) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? 'Unable to update publication.');
    return result.data as Status;
  }
  useEffect(() => {
    let cancelled = false;
    void request('GET').then(value => { if (!cancelled) setStatus(value); }).catch(() => { if (!cancelled) setError('Unable to load publishing status. Reopen this panel to retry.'); });
    return () => { cancelled = true; };
    // Only reload when opening another invitation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  async function update(method: 'POST' | 'DELETE') {
    setBusy(true); setError(''); setCopied(false);
    try { setStatus(await request(method)); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to update publication.'); }
    finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(new URL(status!.url!, window.location.origin).href); setCopied(true); }
    catch { setError('Select the invitation link below and copy it.'); }
  }
  return <div><h2 className="serif text-2xl">Share your celebration</h2><p className="my-4 text-sm leading-6">Publishing makes the invitation and its included media available to anyone with the link. Changes stay in your draft until you publish again.</p>
    {status?.url ? <div className="my-5 rounded-xl border border-ink/20 p-4"><p className="mb-2 text-sm">Your invitation is live.</p><a className="break-all text-sm underline" href={status.url} target="_blank" rel="noopener noreferrer">{status.url}</a><button type="button" className="mt-3 block text-sm underline" onClick={() => void copy()}>{copied ? 'Link copied' : 'Copy link'}</button><p className="mt-3 text-xs">Published draft revision {status.publication?.revision}. Current revision {revision}.</p><button type="button" className="mt-4 text-sm underline" disabled={busy} onClick={() => void update('DELETE')}>Unpublish invitation</button></div> : status && <p className="my-4 text-sm">Private draft. No public invitation is available.</p>}
    <button type="button" className="button" disabled={disabled || busy || !status} onClick={() => void update('POST')}>{busy ? 'Updating…' : status?.url ? 'Republish invitation' : 'Publish invitation'}</button>
    {disabled && <p className="mt-3 text-xs">Wait for your draft and uploads to finish saving before publishing.</p>}
    <p className="mt-4 text-xs leading-5">Payment simulation is active: publishing treats payment as successful. No money is charged and no card details are collected.</p>
    <p className="mt-4 text-xs leading-5">Unpublishing turns off public and guest RSVP links. Previously downloaded files cannot be recalled. Manage private RSVP links and responses in Guests.</p>
    {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
  </div>;
}
