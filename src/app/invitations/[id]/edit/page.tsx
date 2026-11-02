import { r2 } from '@/lib/media/storage';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { invitationRepository } from '@/lib/security/ownership';
import { getTemplateByVersionId } from '@/lib/templates/registry';
import { invitationConfigSchema } from '@/lib/validation/invitation';
import { InvitationEditor } from '@/components/editor/invitation-editor';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Edit your invitation', robots: { index: false, follow: false } };
export default async function EditInvitation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/invitations/${id}/edit`); const invitation = await invitationRepository(getDb(), user.id).find(id);
  if (!invitation) notFound(); const template = getTemplateByVersionId(invitation.templateVersionId);
  if (!template) return <div className="mx-auto max-w-lg px-6 py-12"><h1 className="text-3xl">This draft needs a template.</h1><p className="mt-4">This invitation was created before templates were available. Create a new draft from the gallery to use the editor.</p></div>;
  const parsed = invitationConfigSchema.safeParse(invitation.configuration);
  if (!parsed.success) throw new Error('The saved invitation configuration is not supported.');
  const references = await getDb().mediaReference.findMany({where:{invitationId:id,asset:{ready:true,ownerId:user.id}},include:{asset:true},orderBy:{asset:{createdAt:'asc'}},take:20});
  const media = await Promise.all(references.map(async ({asset})=>({id:asset.id,name:asset.name,mime:asset.mime,artist:asset.artist,loop:asset.loop,url:await r2.read(asset.key)})));
  return <InvitationEditor initialMedia={media} id={invitation.id} template={template} initial={{ title: invitation.title, configuration: parsed.data, revision: invitation.revision }}/>;
}
