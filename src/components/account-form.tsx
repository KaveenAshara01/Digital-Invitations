'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
export function AccountForm({ name }: { name: string }) {
  const [message,setMessage] = useState(''); const [pending,setPending] = useState(false); const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage('');
    const value = String(new FormData(event.currentTarget).get('name') ?? '').trim();
    if (!value || value.length > 100) { setMessage('Enter a name between 1 and 100 characters.'); setPending(false); return; }
    try { const result = await authClient.updateUser({ name: value }); setMessage(result.error?.message ?? 'Your name has been saved.'); if (!result.error) router.refresh(); }
    catch { setMessage('Unable to save. Please try again.'); } finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-5"><label className="block text-sm">Your name<input className="field" name="name" defaultValue={name} required maxLength={100}/></label><button className="button" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</button><p role="status" className="text-sm">{message}</p></form>;
}
