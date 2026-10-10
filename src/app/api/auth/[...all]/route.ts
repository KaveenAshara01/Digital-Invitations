import { toNextJsHandler } from 'better-auth/next-js';
import { getAuth } from '@/lib/auth/server';
import { getEnv } from '@/lib/env';
export const runtime = 'nodejs';
export async function GET(request: Request) { return toNextJsHandler(getAuth()).GET(request); }
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(getEnv().BETTER_AUTH_URL).origin) {
    return Response.json({ error: { code: 'FORBIDDEN', message: 'Request origin is not allowed.' } }, { status: 403 });
  }
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    return Response.json({ error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send a JSON request.' } }, { status: 415 });
  }
  return toNextJsHandler(getAuth()).POST(request);
}
