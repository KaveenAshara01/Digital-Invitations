import { z } from 'zod';

export const sectionIds = ['story', 'details', 'gallery', 'rsvp'] as const;
export const fontIds = ['classic', 'romantic', 'modern'] as const;
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Choose a six-digit hex color');
const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).refine(value => {
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute));
  return year >= 1900 && year <= 2200 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && hour < 24 && minute < 60;
}, 'Enter a valid date and time');
export const invitationConfigSchema = z.object({
  schemaVersion: z.literal(1),
  hosts: z.string().trim().min(1).max(120),
  eventTitle: z.string().trim().min(1).max(120),
  greeting: z.string().max(200),
  description: z.string().max(2000),
  dateTime: z.union([z.literal(''), localDate]),
  timeZone: z.string().max(80).refine(value => { try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } }, 'Choose a valid time zone'),
  venue: z.string().max(180),
  address: z.string().max(300),
  mapUrl: z.union([z.literal(''), z.url().max(1000).refine(value => new URL(value).protocol === 'https:', 'Map links must use HTTPS')]),
  dressCode: z.string().max(180),
  extraInfo: z.string().max(1500),
  theme: z.object({ background: color, ink: color, accent: color, font: z.enum(fontIds), headingScale: z.number().min(.75).max(1.5) }).strict(),
  countdown: z.boolean(),
  opening: z.enum(['reveal', 'skip']),
  rsvp: z.object({ enabled: z.boolean(), note: z.string().max(300) }).strict(),
  sections: z.array(z.object({ id: z.enum(sectionIds), visible: z.boolean() }).strict()).length(sectionIds.length).refine(value => new Set(value.map(section => section.id)).size === sectionIds.length, 'Include each section exactly once'),
}).strict();
export type InvitationConfig = z.infer<typeof invitationConfigSchema>;
export type SectionId = typeof sectionIds[number];
export const createInvitationSchema = z.object({ templateSlug: z.string().min(1).max(80), title: z.string().trim().min(1).max(120) }).strict();
export const saveInvitationSchema = z.object({ title: z.string().trim().min(1).max(120), configuration: invitationConfigSchema, revision: z.number().int().nonnegative() }).strict();
export type SaveInvitationInput = z.infer<typeof saveInvitationSchema>;
