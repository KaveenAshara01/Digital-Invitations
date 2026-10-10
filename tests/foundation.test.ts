import { afterAll, beforeAll, expect, test } from 'vitest';
import EmbeddedPostgres from 'embedded-postgres';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import type { PrismaClient } from '@prisma/client';
import type { getAuth } from '../src/lib/auth/server';
let pg: EmbeddedPostgres;
let directory: string;
let db: PrismaClient;
let auth: ReturnType<typeof getAuth>;
let aliceCookie: string;
let bobCookie: string;
let aliceId: string;
let bobId: string;
let invitationId: string;
const origin = 'http://localhost:3000';
async function request(path: string, body?: unknown, cookie = '', ip = '127.0.0.1', requestOrigin = origin) {
  const route = await import('../src/app/api/auth/[...all]/route');
  const handler = body === undefined ? route.GET : route.POST;
  return handler(new Request(`${origin}/api/auth/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', origin: requestOrigin, cookie, 'x-forwarded-for': ip },
    body: body === undefined ? undefined : JSON.stringify(body),
  }));
}
function cookies(response: Response) { return response.headers.getSetCookie().map(value => value.split(';')[0]).join('; '); }
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'gather-test-'));
  const listener = createServer(); await new Promise<void>(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = (listener.address() as { port: number }).port;
  await new Promise<void>((resolve,reject) => listener.close(error => error ? reject(error) : resolve()));
  pg = new EmbeddedPostgres({ databaseDir: join(directory, 'db'), user: 'postgres', password: 'test-password', port, persistent: false, initdbFlags: ['--encoding=UTF8', '--locale=C'], onLog: () => {} });
  await pg.initialise(); await pg.start(); await pg.createDatabase('invitations');
  process.env.DATABASE_URL = `postgresql://postgres:test-password@localhost:${port}/invitations`;
  process.env.BETTER_AUTH_SECRET = randomBytes(32).toString('hex');
  process.env.BETTER_AUTH_URL = origin;
  const migration = spawnSync(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], { env: process.env, encoding: 'utf8' });
  if (migration.status !== 0) throw new Error(migration.stdout + migration.stderr);
  db = (await import('../src/lib/db/client')).getDb();
  await (await import('../src/lib/templates/seed')).seedTemplates(db);
  auth = (await import('../src/lib/auth/server')).getAuth();
  const alice = await request('sign-up/email', { name: 'Alice', email: 'alice@example.com', password: 'secure-alice-password' });
  expect(alice.status).toBe(200); aliceCookie = cookies(alice); aliceId = (await alice.json()).user.id;
  const bob = await request('sign-up/email', { name: 'Bob', email: 'bob@example.com', password: 'secure-bob-password' }, '', '127.0.0.2');
  expect(bob.status).toBe(200); bobCookie = cookies(bob); bobId = (await bob.json()).user.id;
  invitationId = (await db.invitation.create({ data: { ownerId: aliceId, title: 'Alice’s private event' } })).id;
});
afterAll(async () => { if (db) await db.$disconnect(); if (pg) await pg.stop(); if (directory) await rm(directory, { recursive: true, force: true }); });
test('registration stores a password hash and a database session', async () => {
  const account = await db.account.findFirstOrThrow({ where: { userId: aliceId } });
  expect(account.password).toBeTruthy(); expect(account.password).not.toBe('secure-alice-password');
  expect(await db.session.count({ where: { userId: aliceId } })).toBe(1);
  expect(aliceCookie).toContain('session_token');
});
test('valid login succeeds and invalid credentials fail', async () => {
  expect((await request('sign-in/email', { email: 'alice@example.com', password: 'wrong-password' }, '', '127.0.0.3')).status).toBe(401);
  const response = await request('sign-in/email', { email: 'alice@example.com', password: 'secure-alice-password' }, '', '127.0.0.3');
  expect(response.status).toBe(200); expect(cookies(response)).toContain('session_token');
});
test('invalid registration and duplicate email are rejected', async () => {
  expect((await request('sign-up/email', { name: 'Invalid', email: 'invalid', password: 'short' }, '', '127.0.0.4')).ok).toBe(false);
  expect((await request('sign-up/email', { name: 'Alice 2', email: 'alice@example.com', password: 'secure-new-password' }, '', '127.0.0.4')).ok).toBe(false);
});
test('owner-scoped queries isolate accounts and refuse an absent owner', async () => {
  const { invitationRepository } = await import('../src/lib/security/ownership');
  expect((await invitationRepository(db, aliceId).list()).map(i => i.id)).toEqual([invitationId]);
  expect(await invitationRepository(db, bobId).list()).toEqual([]);
  expect(await invitationRepository(db, bobId).find(invitationId)).toBeNull();
  expect(() => invitationRepository(db, '')).toThrow();
});
test('private API returns 401 without a session, 404 for another owner, and 200 for its owner', async () => {
  const { GET } = await import('../src/app/api/invitations/[id]/route');
  const context = { params: Promise.resolve({ id: invitationId }) };
  const read = (cookie: string) => GET(new Request(`${origin}/api/invitations/${invitationId}`, { headers: { cookie } }), context);
  expect((await read('')).status).toBe(401);
  expect((await read('better-auth.session_token=forged')).status).toBe(401);
  expect((await read(bobCookie)).status).toBe(404);
  const ownerResponse = await read(aliceCookie); expect(ownerResponse.status).toBe(200);
  expect(ownerResponse.headers.get('cache-control')).toBe('private, no-store');
});
test('cross-origin auth mutations are rejected', async () => {
  expect((await request('sign-out', {}, bobCookie, '127.0.0.5', 'https://evil.example')).status).toBe(403);
  const { POST } = await import('../src/app/api/auth/[...all]/route');
  expect((await POST(new Request(`${origin}/api/auth/sign-out`, { method: 'POST', headers: { cookie: bobCookie }, body: '{}' }))).status).toBe(403);
  expect((await POST(new Request(`${origin}/api/auth/sign-out`, { method: 'POST', headers: { origin, cookie: bobCookie, 'content-type': 'text/plain' }, body: '{}' }))).status).toBe(415);
});
test('account settings persist valid names and reject invalid server inputs', async () => {
  expect((await request('update-user', { name: 'Alice Updated' }, aliceCookie, '127.0.0.8')).ok).toBe(true);
  expect((await db.user.findUniqueOrThrow({ where: { id: aliceId } })).name).toBe('Alice Updated');
  expect((await request('update-user', { name: 'x'.repeat(101) }, aliceCookie, '127.0.0.8')).status).toBe(400);
});
test('login attempts are rate limited in database storage', async () => {
  let response: Response | undefined;
  for (let i = 0; i < 6; i++) response = await request('sign-in/email', { email: 'nobody@example.com', password: 'wrong-password' }, '', '127.0.0.6');
  expect(response?.status).toBe(429);
  expect(await db.rateLimit.count()).toBeGreaterThan(0);
});
test('templates seed idempotently with immutable version definitions', async () => {
  const { seedTemplates } = await import('../src/lib/templates/seed');
  await seedTemplates(db);
  expect(await db.template.count()).toBe(8); expect(await db.templateVersion.count()).toBe(8);
  const original = await db.templateVersion.findUniqueOrThrow({ where: { id: 'ivory-vows:1' } });
  await seedTemplates(db);
  expect((await db.templateVersion.findUniqueOrThrow({ where: { id: 'ivory-vows:1' } })).definition).toEqual(original.definition);
});
test('database cache refreshes when the generated schema changes', async () => {
  const cache = globalThis as unknown as { prismaPg?: PrismaClient; prismaPgSchema?: string };
  const previous = { client: cache.prismaPg, schema: cache.prismaPgSchema };
  let disconnected = false;
  cache.prismaPg = { $disconnect: async () => { disconnected = true; } } as unknown as PrismaClient;
  cache.prismaPgSchema = 'previous-schema';
  const { getDb } = await import('../src/lib/db/client');
  let refreshed: PrismaClient | undefined;
  try {
    refreshed = getDb(); expect(disconnected).toBe(true);
    expect(refreshed.templateVersion).toBeDefined(); expect(getDb()).toBe(refreshed);
  } finally { if (refreshed) await refreshed.$disconnect(); cache.prismaPg = previous.client; cache.prismaPgSchema = previous.schema; }
});
function privateRequest(path: string, method: string, cookie: string, body?: unknown, requestOrigin = origin) {
  return new Request(`${origin}${path}`, { method, headers: { cookie, origin: requestOrigin, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
}
test('create, edit, reload and duplicate a real private invitation without publishing', async () => {
  const collection = await import('../src/app/api/invitations/route');
  const single = await import('../src/app/api/invitations/[id]/route');
  const duplicate = await import('../src/app/api/invitations/[id]/duplicate/route');
  const response = await collection.POST(privateRequest('/api/invitations', 'POST', aliceCookie, { templateSlug: 'after-the-doors', title: 'Our wedding' }));
  expect(response.status).toBe(201); const draft = (await response.json()).data;
  expect(draft.templateVersionId).toBe('after-the-doors:1'); expect(draft.status).toBe('DRAFT');
  expect(draft.ownerId).toBe(aliceId);
  const context = { params: Promise.resolve({ id: draft.id }) };
  const configuration = { ...draft.configuration, hosts: 'Nimal & Dilhani', dateTime: '2027-02-14T18:30', theme: { ...draft.configuration.theme, accent: '#b48755' } };
  const update = await single.PATCH(privateRequest(`/api/invitations/${draft.id}`, 'PATCH', aliceCookie, { title: 'Our special day', configuration, revision: 0 }), context);
  expect(update.status).toBe(200); expect((await update.json()).data.revision).toBe(1);
  const refreshed = await single.GET(privateRequest(`/api/invitations/${draft.id}`, 'GET', aliceCookie), context);
  expect((await refreshed.json()).data.configuration).toEqual(configuration);
  const copied = await duplicate.POST(privateRequest(`/api/invitations/${draft.id}/duplicate`, 'POST', aliceCookie), context);
  expect(copied.status).toBe(201); const copy = (await copied.json()).data;
  expect(copy.id).not.toBe(draft.id); expect(copy.title).toBe('Our special day (copy)');
  expect(copy.configuration).toEqual(configuration); expect(copy.status).toBe('DRAFT'); expect(copy.revision).toBe(0);
  const list = await collection.GET(privateRequest('/api/invitations?page=1', 'GET', aliceCookie));
  expect((await list.json()).data.total).toBe(3);
  expect((await single.DELETE(privateRequest(`/api/invitations/${copy.id}`, 'DELETE', aliceCookie), { params: Promise.resolve({ id: copy.id }) })).status).toBe(204);
  expect((await single.DELETE(privateRequest(`/api/invitations/${draft.id}`, 'DELETE', aliceCookie), context)).status).toBe(204);
});
test('other accounts cannot edit, duplicate or delete a private invitation', async () => {
  const collection = await import('../src/app/api/invitations/route');
  const single = await import('../src/app/api/invitations/[id]/route');
  const duplicate = await import('../src/app/api/invitations/[id]/duplicate/route');
  const { freshConfiguration, templates } = await import('../src/lib/templates/registry');
  const input = { title: 'Stolen', configuration: freshConfiguration(templates[0]), revision: 0 };
  const context = { params: Promise.resolve({ id: invitationId }) };
  expect((await single.PATCH(privateRequest(`/api/invitations/${invitationId}`, 'PATCH', bobCookie, input), context)).status).toBe(404);
  expect((await single.DELETE(privateRequest(`/api/invitations/${invitationId}`, 'DELETE', bobCookie), context)).status).toBe(404);
  expect((await duplicate.POST(privateRequest(`/api/invitations/${invitationId}/duplicate`, 'POST', bobCookie), context)).status).toBe(404);
  expect((await collection.GET(privateRequest('/api/invitations', 'GET', bobCookie)).then(r=>r.json())).data.items).toEqual([]);
  expect((await db.invitation.findUniqueOrThrow({ where: { id: invitationId } })).title).toBe('Alice’s private event');
});
test('stale and concurrent saves cannot overwrite a newer revision', async () => {
  const { invitationService } = await import('../src/lib/invitations/service');
  const service = invitationService(db, aliceId);
  const draft = await service.create({ templateSlug: 'ivory-vows', title: 'Revision test' });
  const { invitationConfigSchema } = await import('../src/lib/validation/invitation');
  const input = { title: draft.title, configuration: invitationConfigSchema.parse(draft.configuration), revision: 0 };
  const results = await Promise.allSettled([service.save(draft.id, { ...input, title: 'First tab' }), service.save(draft.id, { ...input, title: 'Second tab' })]);
  expect(results.filter(r=>r.status === 'fulfilled')).toHaveLength(1);
  const rejection = results.find(r=>r.status === 'rejected');
  expect(rejection?.status === 'rejected' && rejection.reason.code).toBe('REVISION_CONFLICT');
  expect((await service.find(draft.id)).revision).toBe(1);
  await service.remove(draft.id);
});
test('invitation mutations reject untrusted origins, malformed data and forged ownership', async () => {
  const collection = await import('../src/app/api/invitations/route');
  const input = { templateSlug: 'ivory-vows', title: 'Validation' };
  expect((await collection.POST(privateRequest('/api/invitations', 'POST', '', input))).status).toBe(401);
  expect((await collection.POST(privateRequest('/api/invitations', 'POST', aliceCookie, input, 'https://evil.example'))).status).toBe(403);
  expect((await collection.POST(privateRequest('/api/invitations', 'POST', aliceCookie, { ...input, ownerId: bobId }))).status).toBe(400);
  expect((await collection.POST(privateRequest('/api/invitations', 'POST', aliceCookie, { ...input, templateSlug: 'does-not-exist' }))).status).toBe(404);
  expect((await collection.POST(privateRequest('/api/invitations', 'POST', aliceCookie, { ...input, title: '' }))).status).toBe(400);
  expect((await collection.POST(privateRequest('/api/invitations', 'POST', aliceCookie, { ...input, title: 'x'.repeat(33_000) }))).status).toBe(413);
  expect((await collection.POST(new Request(`${origin}/api/invitations`, { method: 'POST', headers: { cookie: aliceCookie, origin, 'content-type': 'application/json' }, body: '{invalid' }))).status).toBe(400);
  expect((await collection.GET(privateRequest('/api/invitations?page=-1', 'GET', aliceCookie))).status).toBe(400);
});
test('pagination remains scoped to the authenticated owner', async () => {
  const { invitationService } = await import('../src/lib/invitations/service');
  await db.invitation.createMany({ data: Array.from({length:13},(_,i)=>({ownerId:bobId,title:`Page test ${i}`})) });
  const service = invitationService(db, bobId); const first = await service.list(1); const second = await service.list(2);
  expect(first.items).toHaveLength(12); expect(second.items).toHaveLength(1); expect(first.pages).toBe(2);
  expect(first.items.every(i=>i.ownerId === bobId)).toBe(true);
  expect(new Set([...first.items,...second.items].map(i=>i.id)).size).toBe(13);
  await db.invitation.deleteMany({where:{ownerId:bobId}});
});
test('logout revokes a session and expired sessions are refused', async () => {
  expect((await request('sign-out', {}, bobCookie, '127.0.0.7')).ok).toBe(true);
  expect(await auth.api.getSession({ headers: new Headers({ cookie: bobCookie }) })).toBeNull();
  await db.session.updateMany({ where: { userId: aliceId }, data: { expiresAt: new Date(0) } });
  expect(await auth.api.getSession({ headers: new Headers({ cookie: aliceCookie }) })).toBeNull();
});
