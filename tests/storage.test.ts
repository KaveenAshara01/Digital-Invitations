import { expect, test, vi, afterEach } from 'vitest';
import { r2 } from '../src/lib/media/storage';
afterEach(()=>vi.unstubAllEnvs());
test('signed upload binds object key, type, size and five-minute expiry without revealing the secret',async()=>{
  vi.stubEnv('R2_ACCOUNT_ID','00000000000000000000000000000000');vi.stubEnv('R2_ACCESS_KEY_ID','test-access');vi.stubEnv('R2_SECRET_ACCESS_KEY','test-secret');vi.stubEnv('R2_BUCKET_NAME','private-bucket');
  const url=new URL(await r2.upload('server-generated-key','image/webp',12));
  expect(url.hostname).toBe('private-bucket.00000000000000000000000000000000.r2.cloudflarestorage.com');
  expect(url.pathname).toBe('/pending/server-generated-key');
  expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
  expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-length');
  expect(url.searchParams.get('X-Amz-SignedHeaders')).toContain('content-type');
  expect(url.toString()).not.toContain('test-secret');
});
test('unconfigured storage returns a safe actionable error',async()=>{
  vi.stubEnv('R2_ACCOUNT_ID','');await expect(r2.upload('key','image/png',12)).rejects.toMatchObject({status:503,code:'STORAGE_NOT_CONFIGURED'});
});
