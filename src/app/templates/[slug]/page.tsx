import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTemplate, templates } from '@/lib/templates/registry';
import { InvitationRenderer } from '@/components/templates/invitation-renderer';
export function generateStaticParams() { return templates.map(t => ({ slug: t.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const template = getTemplate((await params).slug); return { title: template?.name ?? 'Design not found' }; }
export default async function TemplatePreview({ params }: { params: Promise<{ slug: string }> }) {
  const template = getTemplate((await params).slug); if (!template) notFound();
  return <div className="mx-auto max-w-6xl px-6 py-10"><Link href="/templates" className="text-sm underline">← All designs</Link><div className="template-preview-layout"><aside className="template-preview-description"><p className="text-xs tracking-widest text-accent uppercase">{template.category} · Original collection</p><h1 className="my-5 text-5xl">{template.name}</h1><p className="text-base leading-7 text-ink/70">{template.description}</p><div className="my-8 border-y border-ink/15 py-5 text-sm leading-7"><p>Custom names, colours, fonts, and event details.</p><p>Reorder sections and make it your own.</p><p>A responsive design for every screen.</p></div><Link href={`/invitations/new?template=${template.slug}`} className="button">Make this invitation ↗</Link><p className="mt-5 text-xs leading-5 text-ink/60">This is a sample preview. Your draft stays private until you publish.</p>{template.cinematic && <p className="mt-3 text-xs leading-5 text-ink/60">Includes a door-opening reveal. Video and music can be added with the upcoming media tools.</p>}</aside><div className="template-full-preview"><InvitationRenderer template={template} configuration={template.defaults}/></div></div></div>;
}
