'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TemplateDefinition } from '@/lib/templates/registry';
export function CreateInvitation({ template }: { template: TemplateDefinition }) {
  const router = useRouter(); const [title, setTitle] = useState(`${template.defaults.hosts} · ${template.category}`); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError('');
    try {
      const response = await fetch('/api/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ templateSlug: template.slug, title: title.trim() }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error?.message ?? 'Unable to create your invitation.');
      router.push(`/invitations/${result.data.id}/edit`); router.refresh();
    } catch(error) { setError(error instanceof Error ? error.message : 'Unable to connect. Please try again.'); } finally { setPending(false); }
  }
  return <form onSubmit={submit} className="mt-8 space-y-5"><label className="block text-sm" htmlFor="invitation-title">Give your invitation a name<input id="invitation-title" className="field" value={title} onChange={e=>setTitle(e.target.value)} required maxLength={120}/></label><p className="text-xs text-ink/60">This name is for your dashboard. You can change the invitation text in the editor.</p><p role="alert" className="text-sm text-red-800">{error}</p><button className="button" disabled={pending || !title.trim()}>{pending ? 'Creating your draft…' : 'Create private draft ↗'}</button></form>;
}
