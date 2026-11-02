import { notFound } from 'next/navigation';
import { getDb } from '@/lib/db/client';
import { guestInvitation } from '@/lib/invitations/guests';
import { RsvpForm } from '@/components/rsvp-form';
import { InvitationRenderer } from '@/components/templates/invitation-renderer';
import { getTemplateByVersionId } from '@/lib/templates/registry';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your invitation and RSVP', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function GuestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await guestInvitation(getDb(), token);
  if (!result) notFound();
  const { guest, configuration } = result;
  const template = getTemplateByVersionId(guest.invitation.publication!.templateVersionId);
  if (!template) notFound();
  const assets = await getDb().publicationMedia.findMany({ where: { publicationId: guest.invitation.publicationId! }, include: { asset: true } });
  const media = assets.map(({ asset }) => ({ id: asset.id, name: asset.name, mime: asset.mime, artist: asset.artist, loop: asset.loop, url: `/i/${guest.invitation.publicSlug}/media/${asset.id}` }));
  return <main className="mx-auto max-w-2xl px-3 py-6"><InvitationRenderer template={template} configuration={configuration} media={media}/><RsvpForm token={token} name={guest.name} partySize={guest.partySize} initialResponse={guest.response} initialAttending={guest.attending} initialNote={guest.note}/></main>;
}
