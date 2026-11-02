import 'server-only';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ApiError } from '@/lib/api/errors';
function storage() {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) throw new ApiError(503, 'STORAGE_NOT_CONFIGURED', 'Photo, video and music uploads need R2 configuration. See docs/storage.md.');
  return { bucket: R2_BUCKET_NAME, client: new S3Client({ region: 'auto', requestChecksumCalculation: 'WHEN_REQUIRED', endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY } }) };
}
export const r2 = {
  upload: async (key: string, mime: string, size: number) => { const {client,bucket}=storage(); return getSignedUrl(client,new PutObjectCommand({Bucket:bucket,Key:`pending/${key}`,ContentType:mime,ContentLength:size}),{expiresIn:300,signableHeaders:new Set(['content-type','content-length'])}); },
  inspect: async (key: string) => { const {client,bucket}=storage(); const head=await client.send(new HeadObjectCommand({Bucket:bucket,Key:`pending/${key}`})); const body=await client.send(new GetObjectCommand({Bucket:bucket,Key:`pending/${key}`,Range:'bytes=0-31',IfMatch:head.ETag})); return {size:head.ContentLength,mime:head.ContentType,etag:head.ETag,bytes:await body.Body!.transformToByteArray()}; },
  finalize: async (key: string, etag: string) => { const {client,bucket}=storage(); await client.send(new CopyObjectCommand({Bucket:bucket,Key:`media/${key}`,CopySource:`${bucket}/pending/${key}`,CopySourceIfMatch:etag})); await client.send(new DeleteObjectCommand({Bucket:bucket,Key:`pending/${key}`})); },
  read: async (key: string, expiresIn = 3600) => { const {client,bucket}=storage(); return getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:`media/${key}`}),{expiresIn}); },
};
