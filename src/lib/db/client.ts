import 'server-only';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getEnv } from '@/lib/env';
import { ApiError } from '@/lib/api/errors';
// Next hot reload can retain a client generated before a schema migration.
// Include the generated model shape so newly added tables are available immediately.
const schemaKey = Prisma.dmmf.datamodel.models.map(model => `${model.name}:${model.fields.map(field => `${field.name}:${field.type}`).join(',')}`).join(';');
const globalDb = globalThis as unknown as { prismaPg?: PrismaClient; prismaPgSchema?: string };
export function getDb() {
  const env = getEnv();
  if (globalDb.prismaPg && globalDb.prismaPgSchema === schemaKey && 'templateVersion' in globalDb.prismaPg) return globalDb.prismaPg;
  if (globalDb.prismaPg) void globalDb.prismaPg.$disconnect().catch(() => {});
  const url = new URL(env.DATABASE_URL);
  // Preserve certificate and hostname verification across pg driver upgrades.
  if (url.searchParams.get('sslmode') === 'require') url.searchParams.set('sslmode', 'verify-full');
  const adapter = new PrismaPg({
    connectionString: url.toString(),
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
    max: 5,
  });
  const db = new PrismaClient({ adapter });
  if (!('templateVersion' in db)) throw new ApiError(503, 'CLIENT_OUTDATED', 'The server needs a restart after the database update. Stop it, run npm run db:generate, then npm run dev.');
  globalDb.prismaPg = db;
  globalDb.prismaPgSchema = schemaKey;
  return db;
}
