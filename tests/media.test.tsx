// @vitest-environment jsdom
import { expect, test, vi, afterEach } from 'vitest';
import { render, cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MediaPanel } from '../src/components/editor/media-panel';
import { uploadSchema, matchesSignature } from '../src/lib/media/validation';
import { InvitationMedia } from '../src/components/templates/invitation-media';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
test('media limits reject oversized, unknown and forged upload fields',()=>{
  expect(uploadSchema.safeParse({name:'photo',mime:'image/jpeg',size:8*1024*1024}).success).toBe(true);
  expect(uploadSchema.safeParse({name:'photo',mime:'image/jpeg',size:8*1024*1024+1}).success).toBe(false);
  expect(uploadSchema.safeParse({name:'script',mime:'image/svg+xml',size:10}).success).toBe(false);
  expect(uploadSchema.safeParse({name:'photo',mime:'image/jpeg',size:10,ownerId:'other'}).success).toBe(false);
  expect(uploadSchema.safeParse({name:'music',mime:'audio/mpeg',size:10}).success).toBe(false);
  expect(uploadSchema.safeParse({name:'music',mime:'audio/mpeg',size:10,license:'Original composition',artist:'Me',loop:false}).success).toBe(true);
});
test('media upload reports progress and adds only server-validated assets to the preview',async()=>{
  const change=vi.fn(); const asset={id:'asset',name:'photo.webp',mime:'image/webp',url:'https://example.invalid/ready'};
  const request=vi.fn().mockResolvedValueOnce(Response.json({data:{id:'asset',url:'https://example.invalid/put'}})).mockResolvedValueOnce(Response.json({data:asset}));vi.stubGlobal('fetch',request);
  const sent=vi.fn();
  class Upload {
    upload:{onprogress?: (event:{lengthComputable:boolean;loaded:number;total:number})=>void}={};status=200;timeout=0;
    onload?:()=>void;onerror?:()=>void;ontimeout?:()=>void;
    open=vi.fn();setRequestHeader=vi.fn();
    send(file:File){sent(file);this.upload.onprogress?.({lengthComputable:true,loaded:file.size,total:file.size});this.onload?.();}
  }
  vi.stubGlobal('XMLHttpRequest',Upload);
  render(<MediaPanel id="draft" items={[]} onChange={change}/>);
  const file=new File(['RIFF0000WEBP'],'photo.webp',{type:'image/webp'});
  await userEvent.setup().upload(screen.getByLabelText('Upload media'),file);
  await waitFor(()=>expect(change).toHaveBeenCalledWith([asset]));expect(sent).toHaveBeenCalledWith(file);
  expect(request.mock.calls.map(call=>call[1].method)).toEqual(['POST','PATCH']);
});
test('failed upload setup displays a useful error and leaves the preview unchanged',async()=>{
  const change=vi.fn();vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:{message:'Storage needs configuration'}},{status:503})));
  render(<MediaPanel id="draft" items={[]} onChange={change}/>);
  await userEvent.setup().upload(screen.getByLabelText('Upload media'),new File(['data'],'photo.jpg',{type:'image/jpeg'}));
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Storage needs configuration'));expect(change).not.toHaveBeenCalled();expect((screen.getByLabelText('Upload media') as HTMLInputElement).disabled).toBe(false);
});

test('multiple uploads accumulate successes and continue after an individual failure',async()=>{
  const change=vi.fn();
  const first={id:'first',name:'first.jpg',mime:'image/jpeg',url:'https://example.com/first'};
  const last={id:'last',name:'last.jpg',mime:'image/jpeg',url:'https://example.com/last'};
  const request=vi.fn()
    .mockResolvedValueOnce(Response.json({data:{id:'first',url:'https://example.com/put'}}))
    .mockResolvedValueOnce(Response.json({data:first}))
    .mockResolvedValueOnce(Response.json({error:{message:'Storage unavailable'}},{status:503}))
    .mockResolvedValueOnce(Response.json({data:{id:'last',url:'https://example.com/put'}}))
    .mockResolvedValueOnce(Response.json({data:last}));
  vi.stubGlobal('fetch',request);
  class Upload {
    upload={};status=200;timeout=0;onload?:()=>void;
    open=vi.fn();setRequestHeader=vi.fn();send(){this.onload?.();}
  }
  vi.stubGlobal('XMLHttpRequest',Upload);
  render(<MediaPanel id="draft" items={[]} onChange={change}/>);
  await userEvent.setup().upload(screen.getByLabelText('Upload media'),['first','failed','last'].map(name=>new File(['data'],`${name}.jpg`,{type:'image/jpeg'})));
  await waitFor(()=>expect(change).toHaveBeenLastCalledWith([first,last]));
  expect(screen.getByRole('alert').textContent).toContain('failed.jpg: Storage unavailable');
  expect(request.mock.calls.map(call=>call[1].method)).toEqual(['POST','PATCH','POST','POST','PATCH']);
  expect((screen.getByLabelText('Upload media') as HTMLInputElement).disabled).toBe(false);
});
test('file signatures reject renamed HTML and recognize supported formats',()=>{
  const bytes=(text:string)=>new TextEncoder().encode(text);
  for(const mime of ['image/jpeg','image/png','image/webp','video/mp4','audio/mpeg'])expect(matchesSignature(mime,bytes('<html>bad</html>'))).toBe(false);
  expect(matchesSignature('image/png',new Uint8Array([137,80,78,71,13,10,26,10]))).toBe(true);
  expect(matchesSignature('image/jpeg',new Uint8Array([255,216,255]))).toBe(true);
  expect(matchesSignature('image/webp',bytes('RIFF0000WEBP'))).toBe(true);
  expect(matchesSignature('video/mp4',bytes('0000ftypisom'))).toBe(true);
  expect(matchesSignature('audio/mpeg',bytes('ID3'))).toBe(true);
});
test('video and audio use explicit controls and defer downloads until playback',()=>{
  render(<InvitationMedia items={[{id:'photo',name:'Our photo',mime:'image/jpeg',url:'https://example.com/photo'},{id:'video',name:'Our film',mime:'video/mp4',url:'https://example.com/video'},{id:'audio',name:'Our music',mime:'audio/mpeg',url:'https://example.com/music'}]}/>);
  for(const media of document.querySelectorAll('video,audio')) { expect(media.getAttribute('preload')).toBe('none');expect(media.hasAttribute('controls')).toBe(true);expect(media.hasAttribute('autoplay')).toBe(false); }
  expect(document.querySelector('video')?.getAttribute('poster')).toBe('https://example.com/photo');cleanup();
});
