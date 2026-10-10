import 'server-only';
import type { z } from 'zod';
import { getAuth } from '@/lib/auth/server';
import { getEnv } from '@/lib/env';
import { ApiError } from './errors';
export async function apiUser(request: Request, mutation = false) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) throw new ApiError(401, 'UNAUTHORIZED', 'Sign in to continue.');
  if (mutation && request.headers.get('origin') !== new URL(getEnv().BETTER_AUTH_URL).origin) throw new ApiError(403, 'FORBIDDEN', 'Request origin is not allowed.');
  return session.user;
}
export async function readJson<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Send a JSON request.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'INVALID_INPUT', 'A request body is required.');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > 32_768) { await reader.cancel(); throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Keep invitation data under 32 KB.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  let parsed: unknown;
  try { const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; } parsed = JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new ApiError(400, 'INVALID_JSON', 'Send valid JSON.'); }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new ApiError(400, 'INVALID_INPUT', result.error.issues[0]?.message ?? 'Check your invitation details.');
  return result.data;
}
export function privateJson(data: unknown, status = 200) { return Response.json({ data }, { status, headers: { 'Cache-Control': 'private, no-store' } }); }
