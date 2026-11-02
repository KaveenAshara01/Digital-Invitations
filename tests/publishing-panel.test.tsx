// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PublishingPanel } from '../src/components/editor/publishing-panel';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('publishing sends the saved revision and media IDs, exposes the public link, and can unpublish',async()=>{
  const request=vi.fn()
    .mockResolvedValueOnce(Response.json({data:{url:null,publication:null}}))
    .mockResolvedValueOnce(Response.json({data:{url:'/i/public-id',publication:{id:'snapshot',revision:3,createdAt:'2026-10-17'}}}))
    .mockResolvedValueOnce(Response.json({data:{url:null,publication:null}}));
  vi.stubGlobal('fetch',request);
  const user=userEvent.setup();
  const {rerender}=render(<PublishingPanel id="draft" revision={3} mediaIds={['photo']} disabled/>);
  await waitFor(()=>expect(screen.getByText('Private draft. No public invitation is available.')).toBeTruthy());
  expect((screen.getByRole('button',{name:'Publish invitation'}) as HTMLButtonElement).disabled).toBe(true);
  rerender(<PublishingPanel id="draft" revision={3} mediaIds={['photo']} disabled={false}/>);
  await user.click(screen.getByRole('button',{name:'Publish invitation'}));
  await waitFor(()=>expect(screen.getByRole('link',{name:'/i/public-id'})).toBeTruthy());
  expect(JSON.parse(request.mock.calls[1][1].body)).toEqual({revision:3,mediaIds:['photo']});
  await user.click(screen.getByRole('button',{name:'Unpublish invitation'}));
  await waitFor(()=>expect(screen.queryByRole('link',{name:'/i/public-id'})).toBeNull());
  expect(request.mock.calls.map(call=>call[1].method)).toEqual(['GET','POST','DELETE']);
});
