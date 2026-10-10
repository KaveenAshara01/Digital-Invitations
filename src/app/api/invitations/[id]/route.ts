import { getAuth } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { invitationRepository } from '@/lib/security/ownership';
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuth().api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: { code: 'UNAUTHORIZED', message: 'Sign in to continue.' } }, { status: 401 });
  const invitation = await invitationRepository(getDb(), session.user.id).find((await params).id);
  if (!invitation) return Response.json({ error: { code: 'NOT_FOUND', message: 'Invitation not found.' } }, { status: 404 });
  return Response.json({ data: invitation }, { headers: { 'Cache-Control': 'private, no-store' } });
}
