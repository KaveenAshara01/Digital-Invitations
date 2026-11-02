import { getDb } from '@/lib/db/client';
import { publicPublication } from '@/lib/invitations/publication';
import { r2 } from '@/lib/media/storage';
import { errorResponse } from '@/lib/api/errors';
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; assetId: string }> }) {
  try {
    const { slug, assetId } = await params;
    const snapshot = await publicPublication(getDb(), slug);
    const asset = snapshot?.media.find(row => row.assetId === assetId)?.asset;
    if (!asset) return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    return new Response(null, { status: 307, headers: { Location: await r2.read(asset.key, 60), 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch (error) { return errorResponse(error); }
}
