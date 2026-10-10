import 'server-only';
import type { PrismaClient } from '@prisma/client';
import { getTemplate, getTemplateByVersionId } from '@/lib/templates/registry';
import { z } from 'zod';
import { invitationConfigSchema, type SaveInvitationInput } from '@/lib/validation/invitation';
import { ApiError } from '@/lib/api/errors';
export function invitationService(db: PrismaClient, ownerId: string) {
  if (!ownerId) throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to continue.');
  const find = async (id: string) => {
    const invitation = await db.invitation.findFirst({ where: { id, ownerId } });
    if (!invitation) throw new ApiError(404, 'NOT_FOUND', 'Invitation not found.');
    return invitation;
  };
  return {
    find,
    list: async (page: number) => {
      const where = { ownerId };
      const [items, total] = await db.$transaction([db.invitation.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 12, take: 12 }), db.invitation.count({ where })]);
      return { items, total, page, pages: Math.max(1, Math.ceil(total / 12)) };
    },
    create: async (input: { templateSlug: string; title: string }) => {
      const template = getTemplate(input.templateSlug);
      if (!template) throw new ApiError(404, 'NOT_FOUND', 'Template not found.');
      const stored = await db.templateVersion.findFirst({ where: { templateId: template.id, version: template.version, template: { active: true } } });
      if (!stored) throw new ApiError(503, 'TEMPLATES_NOT_READY', 'Templates are not ready yet. Run the template seed command.');
      const definition = z.object({ defaults: invitationConfigSchema }).safeParse(stored.definition);
      if (!definition.success) throw new ApiError(503, 'TEMPLATES_NOT_READY', 'The template definition needs to be repaired before use.');
      return db.invitation.create({ data: { ownerId, title: input.title, templateVersionId: stored.id, configuration: definition.data.defaults } });
    },
    save: async (id: string, input: SaveInvitationInput) => {
      const existing = await find(id);
      if (!getTemplateByVersionId(existing.templateVersionId)) throw new ApiError(409, 'UNSUPPORTED_TEMPLATE', 'This invitation needs a supported template version.');
      // Compare and increment atomically. Stale tabs cannot overwrite newer edits.
      const changed = await db.invitation.updateMany({ where: { id, ownerId, revision: input.revision }, data: { title: input.title, configuration: input.configuration, revision: { increment: 1 } } });
      if (!changed.count) throw new ApiError(409, 'REVISION_CONFLICT', 'This draft changed in another tab. Reload the latest saved version before saving again.');
      return { id, revision: input.revision + 1 };
    },
    duplicate: async (id: string) => {
      const invitation = await find(id);
      const configuration = invitationConfigSchema.safeParse(invitation.configuration);
      if (!configuration.success || !getTemplateByVersionId(invitation.templateVersionId)) throw new ApiError(409, 'UNSUPPORTED_TEMPLATE', 'This invitation cannot be duplicated yet.');
      return db.invitation.create({ data: { ownerId, title: `${invitation.title.slice(0, 111)} (copy)`, templateVersionId: invitation.templateVersionId, configuration: configuration.data } });
    },
    remove: async (id: string) => {
      const result = await db.invitation.deleteMany({ where: { id, ownerId } });
      if (!result.count) throw new ApiError(404, 'NOT_FOUND', 'Invitation not found.');
    },
  };
}
