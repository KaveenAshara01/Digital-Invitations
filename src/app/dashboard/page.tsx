import Link from 'next/link';
import { requireUser } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { invitationRepository } from '@/lib/security/ownership';
import { SignOut } from '@/components/sign-out';
export const dynamic = 'force-dynamic';
export default async function Dashboard() {
  const user = await requireUser();
  const invitations = await invitationRepository(getDb(), user.id).list();
  return <div className="mx-auto max-w-6xl px-6 py-12"><div className="flex flex-wrap items-start justify-between gap-6"><div><p className="text-xs tracking-[.2em] text-accent uppercase">Your private workspace</p><h1 className="mt-3 text-4xl">Hello, {user.name}.</h1><p className="mt-4 text-ink/70">A home for everything you’re looking forward to.</p></div><div className="flex gap-6"><Link className="text-sm underline" href="/settings">Account settings</Link><SignOut/></div></div><h2 className="mt-14 text-2xl">Your invitations</h2>{invitations.length ? <ul className="mt-6 space-y-4">{invitations.map(invitation => <li key={invitation.id} className="rounded-2xl border border-ink/15 bg-white p-6"><h3 className="text-2xl">{invitation.title}</h3><p className="mt-2 text-sm">{invitation.status === 'DRAFT' ? 'Private draft' : 'Published'}</p><p className="mt-2 text-xs text-ink/60">Updated {invitation.updatedAt.toISOString().slice(0,10)}</p></li>)}</ul> : <section className="mt-6 rounded-3xl border border-dashed border-ink/25 bg-white/50 px-6 py-16 text-center"><span aria-hidden="true" className="text-4xl text-accent">✳</span><h3 className="mt-5 text-3xl">The best moments are still ahead.</h3><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-ink/70">You don’t have any invitations yet. Template selection and invitation creation will be added in Phase 2.</p></section>}</div>;
}
