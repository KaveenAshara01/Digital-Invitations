import type { PrismaClient } from '@prisma/client';
// Call only with a user ID obtained from a validated server session.
export function invitationRepository(db: Pick<PrismaClient, 'invitation'>, ownerId: string) {
  if (!ownerId) throw new Error('An authenticated owner is required');
  return {
    list: () => db.invitation.findMany({ where: { ownerId }, orderBy: { updatedAt: 'desc' }, take: 50 }),
    find: (id: string) => db.invitation.findFirst({ where: { id, ownerId } }),
  };
}
