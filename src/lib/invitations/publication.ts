import 'server-only';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { invitationConfigSchema } from '@/lib/validation/invitation';
import { getTemplateByVersionId } from '@/lib/templates/registry';

export const publishSchema = z.object({ revision: z.number().int().nonnegative(), mediaIds: z.array(z.string().min(1).max(100)).max(20) }).strict();

export function publicationService(db: PrismaClient, ownerId: string) {
  if (!ownerId) throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to continue.');
  return {
    status: async (id: string) => {
      const row = await db.invitation.findFirst({ where: { id, ownerId }, select: { publicSlug: true, publication: { select: { id: true, revision: true, createdAt: true } } } });
      if (!row) throw new ApiError(404, 'NOT_FOUND', 'Invitation not found.');
      return { url: row.publication && row.publicSlug ? `/i/${row.publicSlug}` : null, publication: row.publication };
    },
    publish: async (id: string, input: z.infer<typeof publishSchema>) => db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM "Invitation" WHERE id = ${id} AND "ownerId" = ${ownerId} FOR UPDATE`;
      const draft = await tx.invitation.findFirst({ where: { id, ownerId } });
      if (!draft) throw new ApiError(404, 'NOT_FOUND', 'Invitation not found.');
      if (draft.revision !== input.revision) throw new ApiError(409, 'REVISION_CONFLICT', 'Your draft changed. Save or reload before publishing.');
      if (!draft.templateVersionId || !getTemplateByVersionId(draft.templateVersionId)) throw new ApiError(409, 'UNSUPPORTED_TEMPLATE', 'Choose a supported template before publishing.');
      const configuration = invitationConfigSchema.parse(draft.configuration);
      const references = await tx.mediaReference.findMany({ where: { invitationId: id, asset: { ready: true, ownerId } }, select: { assetId: true } });
      const ids = references.map(row => row.assetId).sort();
      if (JSON.stringify(ids) !== JSON.stringify([...input.mediaIds].sort())) throw new ApiError(409, 'MEDIA_CHANGED', 'Your media changed. Reload the editor before publishing.');
      if (draft.publicationId && draft.publicSlug) {
        const current = await tx.publication.findUnique({ where: { id: draft.publicationId }, include: { media: true } });
        if (current?.revision === draft.revision && JSON.stringify(current.media.map(row => row.assetId).sort()) === JSON.stringify(ids)) {
          if (!draft.simulatedPaymentAt) await tx.invitation.update({ where: { id }, data: { simulatedPaymentAt: new Date() } });
          return { url: `/i/${draft.publicSlug}`, publication: { id: current.id, revision: current.revision, createdAt: current.createdAt } };
        }
      }
      const snapshot = await tx.publication.create({ data: { invitationId: id, templateVersionId: draft.templateVersionId, configuration, revision: draft.revision, media: { create: ids.map(assetId => ({ assetId })) } } });
      const publicSlug = draft.publicSlug ?? randomUUID();
      // Temporary payment adapter: record simulation separately from any future real charge.
      await tx.invitation.update({ where: { id }, data: { status: 'PUBLISHED', publicSlug, publicationId: snapshot.id, simulatedPaymentAt: draft.simulatedPaymentAt ?? new Date() } });
      return { url: `/i/${publicSlug}`, publication: { id: snapshot.id, revision: snapshot.revision, createdAt: snapshot.createdAt } };
    }),
    unpublish: async (id: string) => {
      const result = await db.invitation.updateMany({ where: { id, ownerId }, data: { status: 'DRAFT', publicationId: null } });
      if (!result.count) throw new ApiError(404, 'NOT_FOUND', 'Invitation not found.');
      return { url: null, publication: null };
    },
  };
}

export async function publicPublication(db: PrismaClient, slug: string) {
  if (!z.uuid().safeParse(slug).success) return null;
  const row = await db.invitation.findFirst({ where: { publicSlug: slug, status: 'PUBLISHED', publicationId: { not: null } }, select: { publication: { include: { media: { include: { asset: true }, orderBy: { asset: { createdAt: 'asc' } } } } } } });
  return row?.publication ?? null;
}
