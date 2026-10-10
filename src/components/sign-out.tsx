'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
export function SignOut() {
  const router = useRouter(); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  async function logout() {
    setPending(true); setError('');
    try { const result = await authClient.signOut(); if (result.error) throw new Error(); router.replace('/login'); router.refresh(); }
    catch { setError('Sign out failed. Try again.'); }
    finally { setPending(false); }
  }
  return <div><button className="text-sm underline" onClick={logout} disabled={pending}>{pending ? 'Signing out…' : 'Sign out'}</button><p role="alert" className="text-sm text-red-800">{error}</p></div>;
}
