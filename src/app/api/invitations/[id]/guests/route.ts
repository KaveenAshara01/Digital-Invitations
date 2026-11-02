import { z } from 'zod';
import { getDb } from '@/lib/db/client';
import { apiUser, privateJson, readJson } from '@/lib/api/request';
import { errorResponse } from '@/lib/api/errors';
import { guestService, guestSchema, guestCsv } from '@/lib/invitations/guests';
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, { params }: Context) {
  try {
    const user = await apiUser(request); const rows = await guestService(getDb(), user.id).list((await params).id);
    if (new URL(request.url).searchParams.get('format') === 'csv') return new Response(guestCsv(rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="guests.csv"', 'Cache-Control': 'private, no-store' } });
    return privateJson(rows);
  } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request, { params }: Context) {
  try { const user = await apiUser(request, true); return privateJson(await guestService(getDb(), user.id).create((await params).id, await readJson(request, guestSchema)), 201); }
  catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request, { params }: Context) {
  try { const user = await apiUser(request, true); const input = await readJson(request, z.object({ guestId: z.string().min(1).max(100) }).strict()); return privateJson(await guestService(getDb(), user.id).remove((await params).id, input.guestId)); }
  catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request, { params }: Context) {
  try { const user = await apiUser(request, true); const input = await readJson(request, z.object({ guestId: z.string().min(1).max(100) }).strict()); return privateJson(await guestService(getDb(), user.id).rotate((await params).id, input.guestId)); }
  catch (error) { return errorResponse(error); }
}
