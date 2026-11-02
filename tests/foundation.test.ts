import { afterAll, beforeAll, expect, test, vi } from 'vitest';
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
  expect(await db.template.count()).toBe(9); expect(await db.templateVersion.count()).toBe(9);
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
test('private media enforces ownership, validates completion and preserves shared copies', async () => {
  const { r2 } = await import('../src/lib/media/storage');
  const upload = vi.spyOn(r2,'upload').mockResolvedValue('https://example.invalid/upload');
  const inspect = vi.spyOn(r2,'inspect').mockResolvedValue({size:12,mime:'image/webp',etag:'etag',bytes:new TextEncoder().encode('RIFF0000WEBP')});
  const finalize = vi.spyOn(r2,'finalize').mockResolvedValue(undefined);
  const read = vi.spyOn(r2,'read').mockResolvedValue('https://example.invalid/private');
  const route = await import('../src/app/api/invitations/[id]/media/route');
  const { invitationService } = await import('../src/lib/invitations/service');
  const service = invitationService(db,aliceId); const draft = await service.create({templateSlug:'ivory-vows',title:'Media test'});
  const context={params:Promise.resolve({id:draft.id})}; const path='/api/invitations/'+draft.id+'/media';
  try {
    expect((await route.GET(privateRequest(path,'GET',''),context)).status).toBe(401);
    expect((await route.GET(privateRequest(path,'GET',bobCookie),context)).status).toBe(404);
    expect((await route.POST(privateRequest(path,'POST',bobCookie,{name:'photo.webp',mime:'image/webp',size:12}),context)).status).toBe(404);
    expect((await route.POST(privateRequest(path,'POST',aliceCookie,{name:'photo.webp',mime:'image/webp',size:12},'https://evil.example'),context)).status).toBe(403);
    const response=await route.POST(privateRequest(path,'POST',aliceCookie,{name:'photo.webp',mime:'image/webp',size:12}),context);
    expect(response.status).toBe(201); const asset=(await response.json()).data;
    expect((await route.GET(privateRequest(path,'GET',aliceCookie),context).then(r=>r.json())).data).toEqual([]);
    inspect.mockResolvedValueOnce({size:99,mime:'image/webp',etag:'etag',bytes:new TextEncoder().encode('RIFF0000WEBP')});
    expect((await route.PATCH(privateRequest(path,'PATCH',aliceCookie,{id:asset.id}),context)).status).toBe(400);expect(finalize).not.toHaveBeenCalled();
    expect((await route.PATCH(privateRequest(path,'PATCH',aliceCookie,{id:asset.id}),context)).status).toBe(200);
    expect((await route.PATCH(privateRequest(path,'PATCH',bobCookie,{id:asset.id}),context)).status).toBe(404);
    const copy=await service.duplicate(draft.id); expect(await db.mediaReference.count({where:{assetId:asset.id}})).toBe(2);
    await route.DELETE(privateRequest(path,'DELETE',aliceCookie,{id:asset.id}),context);
    expect(await db.mediaReference.count({where:{assetId:asset.id}})).toBe(1);expect(await db.mediaAsset.count({where:{id:asset.id,ready:true}})).toBe(1);
    const expired=await db.mediaAsset.create({data:{ownerId:aliceId,key:'expired-test',name:'old',mime:'image/jpeg',size:3,expiresAt:new Date(0),references:{create:{invitationId:draft.id}}}});
    expect((await route.PATCH(privateRequest(path,'PATCH',aliceCookie,{id:expired.id}),context)).status).toBe(410);
    await service.remove(copy.id);
  } finally { await service.remove(draft.id); await db.mediaAsset.deleteMany({where:{ownerId:aliceId}});upload.mockRestore();inspect.mockRestore();finalize.mockRestore();read.mockRestore(); }
});

test('publishing isolates drafts, preserves media, enforces ownership and revokes public access', async () => {
  const { invitationService }=await import('../src/lib/invitations/service');
  const { publicationService,publicPublication }=await import('../src/lib/invitations/publication');
  const route=await import('../src/app/api/invitations/[id]/publish/route');
  const mediaRoute=await import('../src/app/i/[slug]/media/[assetId]/route');
  const { r2 }=await import('../src/lib/media/storage');
  const read=vi.spyOn(r2,'read').mockResolvedValue('https://example.invalid/public-signed');
  const service=invitationService(db,aliceId);
  const draft=await service.create({templateSlug:'kandyan-vows',title:'Private dashboard title'});
  const publisher=publicationService(db,aliceId);
  const context={params:Promise.resolve({id:draft.id})};const path=`/api/invitations/${draft.id}/publish`;
  const asset=await db.mediaAsset.create({data:{ownerId:aliceId,key:'publication-test',name:'Wedding photo',mime:'image/jpeg',size:3,ready:true,expiresAt:new Date(),references:{create:{invitationId:draft.id}}}});
  try {
    expect((await publisher.status(draft.id)).url).toBeNull();
    expect(await publicPublication(db,draft.id)).toBeNull();
    expect((await route.POST(privateRequest(path,'POST','',{revision:0,mediaIds:[asset.id]}),context)).status).toBe(401);
    expect((await route.POST(privateRequest(path,'POST',bobCookie,{revision:0,mediaIds:[asset.id]}),context)).status).toBe(404);
    expect((await route.POST(privateRequest(path,'POST',aliceCookie,{revision:0,mediaIds:[asset.id]},'https://evil.example'),context)).status).toBe(403);
    await expect(publisher.publish(draft.id,{revision:99,mediaIds:[asset.id]})).rejects.toMatchObject({status:409});
    await expect(publisher.publish(draft.id,{revision:0,mediaIds:[]})).rejects.toMatchObject({code:'MEDIA_CHANGED'});
    const first=await publisher.publish(draft.id,{revision:0,mediaIds:[asset.id]});
    const slug=first.url.split('/').pop()!;
    const snapshot=(await publicPublication(db,slug))!;
    expect(snapshot.configuration).toEqual(draft.configuration);
    expect(snapshot.media.map(row=>row.assetId)).toEqual([asset.id]);
    expect(JSON.stringify(snapshot.configuration)).not.toContain('Private dashboard title');
    const publicContext={params:Promise.resolve({slug,assetId:asset.id})};
    expect((await mediaRoute.GET(new Request(`${origin}/i/${slug}/media/${asset.id}`),publicContext)).status).toBe(307);
    expect(read).toHaveBeenCalledWith(asset.key,60);
    const hidden=await db.mediaAsset.create({data:{ownerId:aliceId,key:'not-published',name:'Private photo',mime:'image/jpeg',size:3,ready:true,expiresAt:new Date()}});
    expect((await mediaRoute.GET(new Request(`${origin}/i/${slug}/media/${hidden.id}`),{params:Promise.resolve({slug,assetId:hidden.id})})).status).toBe(404);
    const { freshConfiguration,getTemplate }=await import('../src/lib/templates/registry');
    const changed=freshConfiguration(getTemplate('kandyan-vows')!);changed.hosts='New private names';
    await service.save(draft.id,{title:'New private title',revision:0,configuration:changed});
    await db.mediaReference.deleteMany({where:{invitationId:draft.id}});
    expect((await publicPublication(db,slug))!.configuration).toEqual(snapshot.configuration);
    expect(await db.publicationMedia.count({where:{assetId:asset.id}})).toBe(1);
    await expect(db.mediaAsset.delete({where:{id:asset.id}})).rejects.toBeTruthy();
    const second=await publisher.publish(draft.id,{revision:1,mediaIds:[]});
    expect(second.url).toBe(first.url);expect(second.publication.id).not.toBe(first.publication.id);
    expect((await publicPublication(db,slug))!.configuration).toEqual(changed);
    expect((await db.publication.findUniqueOrThrow({where:{id:first.publication.id}})).configuration).toEqual(snapshot.configuration);
    const copy=await service.duplicate(draft.id);expect(copy.publicSlug).toBeNull();expect(copy.publicationId).toBeNull();await service.remove(copy.id);
    await expect(publicationService(db,bobId).unpublish(draft.id)).rejects.toMatchObject({status:404});
    await publisher.unpublish(draft.id);
    expect(await publicPublication(db,slug)).toBeNull();
    expect((await mediaRoute.GET(new Request(`${origin}/i/${slug}/media/${asset.id}`),publicContext)).status).toBe(404);
    expect((await publisher.publish(draft.id,{revision:1,mediaIds:[]})).url).toBe(first.url);
    await service.remove(draft.id);expect(await publicPublication(db,slug)).toBeNull();
  } finally {
    await db.invitation.deleteMany({where:{id:draft.id}});
    await db.mediaAsset.deleteMany({where:{ownerId:aliceId}});read.mockRestore();
  }
});

test('guest ownership, private responses, rate limits, revocation and simulated payment', async () => {
  const { invitationService } = await import('../src/lib/invitations/service');
  const { publicationService } = await import('../src/lib/invitations/publication');
  const { guestService, guestInvitation, respondToGuest, guestCsv } = await import('../src/lib/invitations/guests');
  const route = await import('../src/app/api/invitations/[id]/guests/route');
  const rsvpRoute = await import('../src/app/api/rsvp/[token]/route');
  const draft = await invitationService(db, aliceId).create({ templateSlug: 'kandyan-vows', title: 'RSVP test' });
  const config = (await import('../src/lib/validation/invitation')).invitationConfigSchema.parse(draft.configuration);
  config.rsvp.enabled = true; config.sections = config.sections.map(section => section.id === 'rsvp' ? { ...section, visible: true } : section);
  await invitationService(db, aliceId).save(draft.id, { title: draft.title, revision: 0, configuration: config });
  const service = guestService(db, aliceId); const publisher = publicationService(db, aliceId);
  const context = { params: Promise.resolve({ id: draft.id }) }; const path = `/api/invitations/${draft.id}/guests`;
  try {
    expect((await route.GET(privateRequest(path, 'GET', ''), context)).status).toBe(401);
    expect((await route.GET(privateRequest(path, 'GET', bobCookie), context)).status).toBe(404);
    expect((await route.POST(privateRequest(path, 'POST', aliceCookie, { name: 'Guest', partySize: 2 }, 'https://evil.example'), context)).status).toBe(403);
    const guest = await service.create(draft.id, { name: '=Guest', email: 'guest@example.com', partySize: 2 });
    await expect(guestService(db, bobId).remove(draft.id, guest.id)).rejects.toMatchObject({ status: 404 });
    await expect(guestService(db, bobId).rotate(draft.id, guest.id)).rejects.toMatchObject({ status: 404 });
    expect(await guestInvitation(db, guest.token)).toBeNull();
    await publisher.publish(draft.id, { revision: 1, mediaIds: [] });
    const paymentAt = (await db.invitation.findUniqueOrThrow({ where: { id: draft.id } })).simulatedPaymentAt;
    expect(paymentAt).toBeInstanceOf(Date);
    await publisher.publish(draft.id, { revision: 1, mediaIds: [] });
    expect((await db.invitation.findUniqueOrThrow({ where: { id: draft.id } })).simulatedPaymentAt).toEqual(paymentAt);
    expect((await guestInvitation(db, guest.token))?.guest.name).toBe('=Guest');
    const rsvpContext = { params: Promise.resolve({ token: guest.token }) };
    expect((await rsvpRoute.POST(privateRequest(`/api/rsvp/${guest.token}`, 'POST', '', { response: 'ACCEPTED', attending: 1 }, 'https://evil.example'), rsvpContext)).status).toBe(403);
    await expect(respondToGuest(db, guest.token, { response: 'ACCEPTED', attending: 3, note: '' })).rejects.toMatchObject({ status: 400 });
    await expect(respondToGuest(db, guest.token, { response: 'DECLINED', attending: 1, note: '' })).rejects.toMatchObject({ status: 400 });
    const response = await rsvpRoute.POST(privateRequest(`/api/rsvp/${guest.token}`, 'POST', '', { response: 'ACCEPTED', attending: 2, note: 'Vegetarian' }), rsvpContext);
    expect(response.status).toBe(200);
    await Promise.all(Array.from({ length: 4 }, () => respondToGuest(db, guest.token, { response: 'ACCEPTED', attending: 1, note: 'Updated' })));
    await expect(respondToGuest(db, guest.token, { response: 'DECLINED', attending: 0, note: '' })).rejects.toMatchObject({ status: 429 });
    expect(guestCsv(await service.list(draft.id))).toContain('"\'=Guest"');
    expect(guestCsv(await service.list(draft.id))).not.toContain(guest.token);
    await db.guest.update({ where: { id: guest.id }, data: { responseWindow: new Date(0) } });
    await respondToGuest(db, guest.token, { response: 'DECLINED', attending: 0, note: '' });
    expect((await service.list(draft.id))[0].response).toBe('DECLINED');
    await publisher.unpublish(draft.id);
    await expect(respondToGuest(db, guest.token, { response: 'ACCEPTED', attending: 1, note: '' })).rejects.toMatchObject({ status: 404 });
    await publisher.publish(draft.id, { revision: 1, mediaIds: [] });
    await service.rotate(draft.id, guest.id); expect(await guestInvitation(db, guest.token)).toBeNull();
    const rotated = (await service.list(draft.id))[0]; expect(await guestInvitation(db, rotated.token)).toBeTruthy();
    await service.remove(draft.id, guest.id); expect(await guestInvitation(db, rotated.token)).toBeNull();
  } finally { await db.invitation.deleteMany({ where: { id: draft.id } }); }
});

test('logout revokes a session and expired sessions are refused', async () => {
  expect((await request('sign-out', {}, bobCookie, '127.0.0.7')).ok).toBe(true);
  expect(await auth.api.getSession({ headers: new Headers({ cookie: bobCookie }) })).toBeNull();
  await db.session.updateMany({ where: { userId: aliceId }, data: { expiresAt: new Date(0) } });
  expect(await auth.api.getSession({ headers: new Headers({ cookie: aliceCookie }) })).toBeNull();
});
