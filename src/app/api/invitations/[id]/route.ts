import { getAuth } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { invitationRepository } from '@/lib/security/ownership';
import { apiUser, readJson, privateJson } from '@/lib/api/request';
import { errorResponse } from '@/lib/api/errors';
import { invitationService } from '@/lib/invitations/service';
import { saveInvitationSchema } from '@/lib/validation/invitation';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } }, { status: 401 });
  const invitation = await invitationRepository(getDb(), session.user.id).find((await params).id);
  if (!invitation) return Response.json({ error: { code: 'NOT_FOUND', message: 'Invitation not found.' } }, { status: 404 });
  return Response.json({ data: invitation }, { headers: { 'Cache-Control': 'private, no-store' } });
}
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await apiUser(request, true); const input = await readJson(request, saveInvitationSchema); return privateJson(await invitationService(getDb(), user.id).save((await params).id, input)); }
  catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try { const user = await apiUser(request, true); await invitationService(getDb(), user.id).remove((await params).id); return new Response(null, { status: 204 }); }
  catch (error) { return errorResponse(error); }
}
