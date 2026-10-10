import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { seedTemplates } from '../src/lib/templates/seed';
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env before seeding templates.');
  const url = new URL(process.env.DATABASE_URL);
  if (url.searchParams.get('sslmode') === 'require') url.searchParams.set('sslmode', 'verify-full');
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString(), connectionTimeoutMillis: 30_000, max: 5 }) });
  try { await seedTemplates(db); console.log('Eight template definitions are ready.'); } finally { await db.$disconnect(); }
}
main().catch(() => { console.error('Template seeding failed. Check DATABASE_URL, apply migrations, and retry.'); process.exitCode = 1; });
