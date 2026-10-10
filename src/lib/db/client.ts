import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { getEnv } from '@/lib/env';
// A distinct cache key prevents hot reload from reusing the old native-engine client.
const globalDb = globalThis as unknown as { prismaPg?: PrismaClient };
export function getDb() {
  const env = getEnv();
  if (globalDb.prismaPg) return globalDb.prismaPg;
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
  globalDb.prismaPg = db;
  return db;
}
