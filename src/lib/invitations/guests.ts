import 'server-only';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';
import { invitationConfigSchema } from '@/lib/validation/invitation';

export const guestSchema = z.object({ name: z.string().trim().min(1).max(120), email: z.union([z.email().max(254), z.literal('')]).optional(), partySize: z.number().int().min(1).max(20) }).strict();
export const responseSchema = z.object({ response: z.enum(['ACCEPTED', 'DECLINED']), attending: z.number().int().min(0).max(20), note: z.string().trim().max(500).default('') }).strict();

export function guestService(db: PrismaClient, ownerId: string) {
  if (!ownerId) throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to continue.');
  async function owned(id: string) {
    if (!await db.invitation.findFirst({ where: { id, ownerId }, select: { id: true } })) throw new ApiError(404, 'NOT_FOUND', 'Invitation not found.');
  }
  return {
    list: async (id: string) => { await owned(id); return db.guest.findMany({ where: { invitationId: id }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, email: true, partySize: true, token: true, response: true, attending: true, note: true, respondedAt: true } }); },
    create: async (id: string, input: z.infer<typeof guestSchema>) => { await owned(id); return db.guest.create({ data: { ...input, email: input.email || null, invitationId: id } }); },
    remove: async (id: string, guestId: string) => {
      const result = await db.guest.deleteMany({ where: { id: guestId, invitationId: id, invitation: { ownerId } } });
      if (!result.count) throw new ApiError(404, 'NOT_FOUND', 'Guest not found.');
      return { deleted: true };
    },
    rotate: async (id: string, guestId: string) => {
      const result = await db.guest.updateMany({ where: { id: guestId, invitationId: id, invitation: { ownerId } }, data: { token: randomUUID() } });
      if (!result.count) throw new ApiError(404, 'NOT_FOUND', 'Guest not found.');
      return { rotated: true };
    },
  };
}

export async function guestInvitation(db: Pick<PrismaClient, 'guest'>, token: string) {
  if (!z.uuid().safeParse(token).success) return null;
  const guest = await db.guest.findUnique({ where: { token }, include: { invitation: { include: { publication: true } } } });
  if (!guest || guest.invitation.status !== 'PUBLISHED' || !guest.invitation.publication) return null;
  const config = invitationConfigSchema.safeParse(guest.invitation.publication.configuration);
  if (!config.success || !config.data.rsvp.enabled || !config.data.sections.some(section => section.id === 'rsvp' && section.visible)) return null;
  return { guest, configuration: config.data };
}

export async function respondToGuest(db: PrismaClient, token: string, input: z.infer<typeof responseSchema>) {
  return db.$transaction(async tx => {
    // Serialize submissions and publication changes; limits survive process restarts.
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT i.id FROM "Invitation" i JOIN "Guest" g ON g."invitationId" = i.id WHERE g.token = ${token} FOR UPDATE OF i`;
    if (!rows.length) throw new ApiError(404, 'NOT_FOUND', 'This RSVP link is unavailable.');
    await tx.$queryRaw`SELECT id FROM "Guest" WHERE token = ${token} FOR UPDATE`;
    const result = await guestInvitation(tx, token);
    if (!result) throw new ApiError(404, 'NOT_FOUND', 'This RSVP link is unavailable.');
    const { guest } = result;
    const now = new Date();
    const sameWindow = guest.responseWindow && now.getTime() - guest.responseWindow.getTime() < 60_000;
    if (sameWindow && guest.responseAttempts >= 5) throw new ApiError(429, 'RATE_LIMITED', 'Please wait a minute before updating your response.');
    if ((input.response === 'ACCEPTED' && (input.attending < 1 || input.attending > guest.partySize)) || (input.response === 'DECLINED' && input.attending !== 0)) throw new ApiError(400, 'INVALID_INPUT', 'Check the number of guests attending.');
    await tx.guest.update({ where: { id: guest.id }, data: { ...input, respondedAt: now, responseWindow: sameWindow ? guest.responseWindow : now, responseAttempts: sameWindow ? guest.responseAttempts + 1 : 1 } });
    return { response: input.response, attending: input.attending };
  });
}

export function guestCsv(rows: { name: string; email: string | null; partySize: number; response: string; attending: number; note: string }[]) {
  const cell = (value: string | number | null) => { const text = String(value ?? ''); return `"${(/^[\s]*[=+\-@\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`; };
  return '\uFEFF' + [['Name', 'Email', 'Party size', 'Response', 'Attending', 'Note'], ...rows.map(row => [row.name, row.email, row.partySize, row.response, row.attending, row.note])].map(row => row.map(cell).join(',')).join('\r\n');
}
