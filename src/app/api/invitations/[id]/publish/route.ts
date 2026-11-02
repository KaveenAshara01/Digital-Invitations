import { getDb } from '@/lib/db/client';
import { apiUser, privateJson, readJson } from '@/lib/api/request';
import { errorResponse } from '@/lib/api/errors';
import { publicationService, publishSchema } from '@/lib/invitations/publication';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  try { const user = await apiUser(request); return privateJson(await publicationService(getDb(), user.id).status((await params).id)); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, { params }: Context) {
  try { const user = await apiUser(request, true); const input = await readJson(request, publishSchema); return privateJson(await publicationService(getDb(), user.id).publish((await params).id, input), 201); }
  catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request, { params }: Context) {
  try { const user = await apiUser(request, true); return privateJson(await publicationService(getDb(), user.id).unpublish((await params).id)); }
  catch (error) { return errorResponse(error); }
}
