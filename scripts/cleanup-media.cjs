// Run from the project root. Removes only expired uploads and old, unreferenced media.
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
async function main() {
  const required=['DATABASE_URL','R2_ACCOUNT_ID','R2_ACCESS_KEY_ID','R2_SECRET_ACCESS_KEY','R2_BUCKET_NAME'];
  if(required.some(name=>!process.env[name]))throw new Error('Storage and database environment values are required.');
  const connection=new URL(process.env.DATABASE_URL);if(connection.searchParams.get('sslmode')==='require')connection.searchParams.set('sslmode','verify-full');
  const db=new PrismaClient({adapter:new PrismaPg({connectionString:connection.toString(),max:1})});
  const storage=new S3Client({region:'auto',endpoint:`https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,credentials:{accessKeyId:process.env.R2_ACCESS_KEY_ID,secretAccessKey:process.env.R2_SECRET_ACCESS_KEY}});
  let count=0;
  try {
    const candidates=await db.mediaAsset.findMany({where:{OR:[{ready:false,expiresAt:{lt:new Date(Date.now()-3600000)}},{ready:true,createdAt:{lt:new Date(Date.now()-86400000)},references:{none:{}},publications:{none:{}}}]},select:{id:true},take:100});
    for(const candidate of candidates) await db.$transaction(async tx=>{
      const rows=await tx.$queryRaw`SELECT id FROM "MediaAsset" WHERE id = ${candidate.id} FOR UPDATE`;
      if(!rows.length)return;
      const asset=await tx.mediaAsset.findUnique({where:{id:candidate.id},include:{_count:{select:{references:true,publications:true}}}});
      if(!asset || (asset.ready && (asset._count.references>0 || asset._count.publications>0)))return;
      if(!asset.ready && asset.expiresAt.getTime()>Date.now()-3600000)return;
      for(const prefix of ['pending','media'])await storage.send(new DeleteObjectCommand({Bucket:process.env.R2_BUCKET_NAME,Key:`${prefix}/${asset.key}`}));
      await tx.mediaReference.deleteMany({where:{assetId:asset.id}});
      await tx.mediaAsset.delete({where:{id:asset.id}}); count++;
    },{timeout:30000});
    console.log(`Removed ${count} expired or unused media assets.`);
  } finally {await db.$disconnect();storage.destroy();}
}
main().catch(()=>{console.error('Media cleanup failed. Check storage credentials and database connectivity; rerun to retry.');process.exitCode=1;});
