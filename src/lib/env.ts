import 'server-only';
import { z } from 'zod';
const schema = z.object({
  DATABASE_URL: z.string().regex(/^postgres(?:ql)?:\/\//, 'Use a PostgreSQL connection URL'),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
});
export function getEnv() {
  const result = schema.safeParse(process.env);
  if (!result.success) throw new Error(`Missing or invalid server configuration: ${result.error.issues.map(i => i.path.join('.')).join(', ')}. Copy .env.example to .env and follow docs/setup.md.`);
  if (result.data.BETTER_AUTH_SECRET.startsWith('replace-with-')) throw new Error('Generate BETTER_AUTH_SECRET; the example placeholder cannot be used.');
  return result.data;
}
