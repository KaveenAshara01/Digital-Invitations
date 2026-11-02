import { getDb } from '@/lib/db/client';
import { privateJson, readJson } from '@/lib/api/request';
import { ApiError, errorResponse } from '@/lib/api/errors';
import { getEnv } from '@/lib/env';
import { respondToGuest, responseSchema } from '@/lib/invitations/guests';
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    if (request.headers.get('origin') !== new URL(getEnv().BETTER_AUTH_URL).origin) throw new ApiError(403, 'FORBIDDEN', 'Request origin is not allowed.');
    return privateJson(await respondToGuest(getDb(), (await params).token, await readJson(request, responseSchema)));
  } catch (error) { return errorResponse(error); }
}
