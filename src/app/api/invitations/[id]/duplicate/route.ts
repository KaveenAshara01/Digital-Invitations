import { apiUser, privateJson } from '@/lib/api/request';
import { errorResponse } from '@/lib/api/errors';
import { getDb } from '@/lib/db/client';
import { invitationService } from '@/lib/invitations/service';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await apiUser(request, true); return privateJson(await invitationService(getDb(), user.id).duplicate((await params).id), 201); }
  catch (error) { return errorResponse(error); }
}
