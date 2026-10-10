import { getDb } from '@/lib/db/client';
import { invitationService } from '@/lib/invitations/service';
import { apiUser, readJson, privateJson } from '@/lib/api/request';
import { ApiError, errorResponse } from '@/lib/api/errors';
import { createInvitationSchema } from '@/lib/validation/invitation';
export async function POST(request: Request) {
  try { const user = await apiUser(request, true); const input = await readJson(request, createInvitationSchema); return privateJson(await invitationService(getDb(), user.id).create(input), 201); }
  catch (error) { return errorResponse(error); }
}
export async function GET(request: Request) {
  try {
    const user = await apiUser(request); const page = Number(new URL(request.url).searchParams.get('page') ?? 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new ApiError(400, 'INVALID_INPUT', 'Choose a valid page.');
    return privateJson(await invitationService(getDb(), user.id).list(page));
  } catch (error) { return errorResponse(error); }
}
