'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { authClient } from '@/lib/auth/client';
export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const register = mode === 'register';
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setPending(true);
    const form = new FormData(event.currentTarget);
    const parsed = z.object({ email: z.email(), password: z.string().min(register ? 12 : 1).max(128), name: register ? z.string().trim().min(1).max(100) : z.string() }).safeParse({ email: form.get('email'), password: form.get('password'), name: form.get('name') ?? '' });
    if (!parsed.success) { setError('Enter a valid email, name, and password (at least 12 characters for a new account).'); setPending(false); return; }
    try {
      const result = register ? await authClient.signUp.email(parsed.data) : await authClient.signIn.email({ email: parsed.data.email, password: parsed.data.password });
      if (result.error) { setError(result.error.message ?? 'Unable to sign in. Please try again.'); return; }
      router.replace('/dashboard'); router.refresh();
    } catch { setError('Unable to connect. Please try again.'); }
    finally { setPending(false); }
  }
  return <div className="mx-auto max-w-md px-6 py-14"><p className="text-xs tracking-[.2em] text-accent uppercase">Your celebrations, together</p><h1 className="mt-4 text-4xl">{register ? 'A beautiful beginning.' : 'Welcome back.'}</h1><p className="mt-4 text-ink/70">{register ? 'Create your private space for the moments ahead.' : 'Sign in to your invitation workspace.'}</p><form onSubmit={submit} className="mt-8 space-y-5">{register && <label className="block text-sm">Your name<input className="field" name="name" autoComplete="name" required maxLength={100}/></label>}<label className="block text-sm">Email address<input className="field" name="email" type="email" autoComplete="email" required maxLength={254}/></label><label className="block text-sm">Password<input className="field" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={register ? 12 : 1} maxLength={128}/></label>{register && <p className="text-xs text-ink/60">Use at least 12 characters.</p>}<p role="alert" className="text-sm text-red-800">{error}</p><button className="button w-full" disabled={pending}>{pending ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button></form><p className="mt-7 text-center text-sm">{register ? 'Already have an account?' : 'New to Gather?'} <Link className="underline" href={register ? '/login' : '/register'}>{register ? 'Sign in' : 'Create an account'}</Link></p></div>;
}
