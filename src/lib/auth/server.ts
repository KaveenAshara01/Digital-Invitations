import 'server-only';
import { betterAuth } from 'better-auth';
import { APIError } from 'better-auth/api';
import { z } from 'zod';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getDb } from '@/lib/db/client';
import { getEnv } from '@/lib/env';
function createAuth() {
  const env = getEnv();
  return betterAuth({
    database: prismaAdapter(getDb(), { provider: 'postgresql' }),
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.BETTER_AUTH_URL],
    databaseHooks: {
      user: {
        create: { before: async (user) => ({ data: { ...user, name: validateName(user.name) } }) },
        update: { before: async (user) => ({ data: user.name === undefined ? user : { ...user, name: validateName(user.name) } }) },
      },
    },
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 60, customRules: {
      '/sign-in/email': { window: 60, max: 5 },
      '/sign-up/email': { window: 60, max: 5 },
    } },
    advanced: { useSecureCookies: env.BETTER_AUTH_URL.startsWith('https://') },
  });
}
function validateName(name: string) {
  const result = z.string().trim().min(1).max(100).safeParse(name);
  if (!result.success) throw new APIError('BAD_REQUEST', { message: 'Name must be between 1 and 100 characters.' });
  return result.data;
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  instance ??= createAuth();
  return instance;
}
export async function requireUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  if (!session) redirect('/login');
  return session.user;
}
