import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { getTemplate } from '@/lib/templates/registry';
import { CreateInvitation } from '@/components/create-invitation';
export const dynamic = 'force-dynamic';
export default async function NewInvitation({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template: slug } = await searchParams;
  await requireUser(`/invitations/new${slug ? `?template=${encodeURIComponent(slug)}` : ''}`);
  if (!slug) redirect('/templates');
  const template = getTemplate(slug); if (!template) notFound();
  return <div className="mx-auto grid max-w-4xl items-center gap-10 px-6 py-12 md:grid-cols-2"><div><Link href="/templates" className="text-sm underline">← Choose another design</Link><p className="mt-10 text-xs tracking-widest text-accent uppercase">A little something special</p><h1 className="mt-4 text-4xl">Let’s make it yours.</h1><p className="mt-5 leading-7 text-ink/70">Start with <strong>{template.name}</strong>. Add your details and see your invitation come to life.</p><CreateInvitation template={template}/></div><div className="overflow-hidden rounded-3xl border border-ink/15"><img src={template.previewImage} width={400} height={520} alt={`${template.name} design`} className="w-full"/></div></div>;
}
