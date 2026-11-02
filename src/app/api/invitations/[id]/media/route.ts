import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { getDb } from '@/lib/db/client';
import { apiUser, privateJson, readJson } from '@/lib/api/request';
import { ApiError, errorResponse } from '@/lib/api/errors';
import { invitationService } from '@/lib/invitations/service';
import { uploadSchema, matchesSignature } from '@/lib/media/validation';
import { r2 } from '@/lib/media/storage';
type Context = { params: Promise<{id:string}> };
async function owned(request: Request, context: Context, mutation: boolean) { const user=await apiUser(request,mutation); const {id}=await context.params; const db=getDb(); await invitationService(db,user.id).find(id); return {db,id,user}; }
export async function GET(request: Request, context: Context) {
  try { const {db,id}=await owned(request,context,false); const rows=await db.mediaReference.findMany({where:{invitationId:id,asset:{ready:true}},include:{asset:true},orderBy:{asset:{createdAt:'asc'}},take:20}); return privateJson(await Promise.all(rows.map(async ({asset})=>({id:asset.id,name:asset.name,mime:asset.mime,artist:asset.artist,loop:asset.loop,url:await r2.read(asset.key)})))); } catch(error) { return errorResponse(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const {db,id,user}=await owned(request,context,true); const input=await readJson(request,uploadSchema);
    const key=randomUUID(); const url=await r2.upload(key,input.mime,input.size);
    const asset=await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Invitation" WHERE id = ${id} FOR UPDATE`;
      const usage=await tx.mediaAsset.aggregate({where:{ownerId:user.id},_sum:{size:true},_count:true});
      if (usage._count >= 100 || (usage._sum.size ?? 0)+input.size > 250*1024*1024) throw new ApiError(413,'STORAGE_LIMIT','Your media allowance is full (100 files / 250 MB).');
      if (await tx.mediaReference.count({where:{invitationId:id}}) >= 20) throw new ApiError(413,'MEDIA_LIMIT','Use up to 20 media files per invitation.');
      return tx.mediaAsset.create({data:{ownerId:user.id,key,...input,expiresAt:new Date(Date.now()+300000),references:{create:{invitationId:id}}}});
    }); return privateJson({id:asset.id,url},201);
  } catch(error) { return errorResponse(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const {db,id,user}=await owned(request,context,true); const input=await readJson(request,z.object({id:z.string().max(100)}).strict());
    const asset=await db.mediaAsset.findFirst({where:{id:input.id,ownerId:user.id,references:{some:{invitationId:id}}}});
    if (!asset) throw new ApiError(404,'NOT_FOUND','Media not found.');
    if (!asset.ready) {
      if (asset.expiresAt.getTime() < Date.now()) throw new ApiError(410,'UPLOAD_EXPIRED','Upload expired. Please upload again.');
      const actual=await r2.inspect(asset.key);
      if (actual.size !== asset.size || actual.mime !== asset.mime || !matchesSignature(asset.mime,actual.bytes) || !actual.etag) throw new ApiError(400,'INVALID_FILE','The uploaded file does not match its declared format or size.');
      await r2.finalize(asset.key,actual.etag); await db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "Invitation" WHERE id = ${id} FOR UPDATE`;await tx.mediaAsset.update({where:{id:asset.id},data:{ready:true}});});
    }
    return privateJson({id:asset.id,name:asset.name,mime:asset.mime,artist:asset.artist,loop:asset.loop,url:await r2.read(asset.key)});
  } catch(error) { return errorResponse(error); }
}
export async function DELETE(request: Request, context: Context) {
  try { const {db,id}=await owned(request,context,true); const input=await readJson(request,z.object({id:z.string().max(100)}).strict()); await db.$transaction(async tx=>{await tx.$queryRaw`SELECT id FROM "Invitation" WHERE id = ${id} FOR UPDATE`;await tx.mediaReference.deleteMany({where:{invitationId:id,assetId:input.id}});}); return privateJson({removed:true}); } catch(error) { return errorResponse(error); }
}
