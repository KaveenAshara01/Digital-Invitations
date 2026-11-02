import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db/client';
import { publicPublication } from '@/lib/invitations/publication';
import { getTemplateByVersionId } from '@/lib/templates/registry';
import { invitationConfigSchema } from '@/lib/validation/invitation';
import { InvitationRenderer } from '@/components/templates/invitation-renderer';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'You are invited', robots: { index: false, follow: false } };
export default async function PublicInvitation({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const snapshot = await publicPublication(getDb(), slug);
  if (!snapshot) notFound();
  const template = getTemplateByVersionId(snapshot.templateVersionId);
  const configuration = invitationConfigSchema.safeParse(snapshot.configuration);
  if (!template || !configuration.success) notFound();
  const media = snapshot.media.map(({ asset }) => ({ id: asset.id, name: asset.name, mime: asset.mime, artist: asset.artist, loop: asset.loop, url: `/i/${slug}/media/${asset.id}` }));
  return <div className="mx-auto max-w-2xl px-3 py-6"><InvitationRenderer template={template} configuration={configuration.data} media={media}/></div>;
}
