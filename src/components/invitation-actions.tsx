'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function InvitationActions({ id, title }: { id: string; title: string }) {
  const router = useRouter(); const [pending, setPending] = useState<'duplicate' | 'delete' | null>(null); const [confirm, setConfirm] = useState(false); const [error, setError] = useState('');
  async function action(kind: 'duplicate' | 'delete') {
    setPending(kind); setError('');
    try {
      const response = await fetch(`/api/invitations/${id}${kind === 'duplicate' ? '/duplicate' : ''}`, { method: kind === 'duplicate' ? 'POST' : 'DELETE' });
      if (!response.ok) { const result = await response.json(); throw new Error(result.error?.message ?? 'Unable to complete this action.'); }
      if (kind === 'duplicate') { const result = await response.json(); router.push(`/invitations/${result.data.id}/edit`); }
      setConfirm(false); router.refresh();
    } catch(error) { setError(error instanceof Error ? error.message : 'Unable to connect. Please try again.'); } finally { setPending(null); }
  }
  return <div><div className="flex flex-wrap gap-5 text-xs"><button type="button" disabled={!!pending} onClick={()=>action('duplicate')}>{pending === 'duplicate' ? 'Duplicating…' : 'Duplicate'}</button><button type="button" disabled={!!pending} onClick={()=>setConfirm(true)}>Delete</button></div>{confirm && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm"><p>Delete “{title}”? This permanently removes the invitation.</p><div className="mt-3 flex gap-5"><button type="button" className="font-semibold text-red-800" disabled={!!pending} onClick={()=>action('delete')}>{pending === 'delete' ? 'Deleting…' : 'Delete invitation'}</button><button type="button" disabled={!!pending} onClick={()=>setConfirm(false)}>Keep it</button></div></div>}<p role="alert" className="mt-2 text-xs text-red-800">{error}</p></div>;
}
