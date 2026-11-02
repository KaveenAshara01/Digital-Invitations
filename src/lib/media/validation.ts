import { z } from 'zod';
export const limits = { 'image/jpeg': 8, 'image/png': 8, 'image/webp': 8, 'video/mp4': 40, 'audio/mpeg': 10 } as const;
export const uploadSchema = z.object({ name: z.string().trim().min(1).max(180), mime: z.enum(['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/mpeg']), size: z.number().int().positive(), artist: z.string().trim().max(120).optional(), license: z.string().trim().max(500).optional(), loop: z.boolean().optional() }).strict().refine(value => value.size <= limits[value.mime] * 1024 * 1024, 'This file exceeds the upload limit.').refine(value => value.mime !== 'audio/mpeg' || !!value.license, 'For music, describe your ownership or license before uploading.');
export function matchesSignature(mime: string, bytes: Uint8Array) {
  const text = (start: number, end: number) => new TextDecoder().decode(bytes.slice(start, end));
  if (mime === 'image/jpeg') return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === 'image/png') return [137,80,78,71,13,10,26,10].every((byte,index)=>bytes[index] === byte);
  if (mime === 'image/webp') return text(0,4) === 'RIFF' && text(8,12) === 'WEBP';
  if (mime === 'video/mp4') return text(4,8) === 'ftyp';
  return mime === 'audio/mpeg' && (text(0,3) === 'ID3' || (bytes[0] === 255 && (bytes[1] & 224) === 224));
}
export type MediaPreview = { id: string; name: string; mime: string; url: string; artist?: string | null; loop?: boolean };
