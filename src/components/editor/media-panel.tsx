'use client';
import { useEffect, useState } from 'react';
import { uploadSchema, type MediaPreview } from '@/lib/media/validation';
export function MediaPanel({id,items,onChange,onBusyChange}:{id:string;items:MediaPreview[];onChange:(items:MediaPreview[])=>void;onBusyChange?:(busy:boolean)=>void}) {
  const [busy,setBusy]=useState(false); const [progress,setProgress]=useState(0); const [error,setError]=useState('');
  const [license,setLicense]=useState(''); const [artist,setArtist]=useState(''); const [loop,setLoop]=useState(false); const [queue,setQueue]=useState('');
  useEffect(()=>{onBusyChange?.(busy);},[busy,onBusyChange]);
  async function json(method:string,body:unknown) { const response=await fetch(`/api/invitations/${id}/media`,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const result=await response.json(); if(!response.ok)throw new Error(result.error?.message ?? 'Media request failed.'); return result.data; }
  async function upload(files:File[]) {
    if (!files.length || busy) return;
    setError('');
    if (items.length + files.length > 20) { setError('An invitation can contain up to 20 files. Select fewer files or remove an existing one.'); return; }
    setBusy(true); setProgress(0);
    const uploaded = [...items];
    const failures: string[] = [];
    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        setQueue(`File ${index + 1} of ${files.length}: ${file.name}`); setProgress(0);
        const input=uploadSchema.safeParse({name:file.name,mime:file.type,size:file.size,...(file.type === 'audio/mpeg' ? {license,artist,loop} : {})});
        if (!input.success) { failures.push(`${file.name}: ${input.error.issues[0].message}`); continue; }
        try {
          const target=await json('POST',input.data);
          await new Promise<void>((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('PUT',target.url);xhr.setRequestHeader('Content-Type',file.type);xhr.upload.onprogress=event=>{if(event.lengthComputable)setProgress(Math.round(event.loaded/event.total*100));};xhr.onload=()=>xhr.status>=200&&xhr.status<300?resolve():reject(new Error('Upload failed. Check the bucket CORS settings and try again.'));xhr.onerror=()=>reject(new Error('Unable to upload. Check your connection and try again.'));xhr.timeout=180000;xhr.ontimeout=()=>reject(new Error('Upload timed out. Try a smaller file.'));xhr.send(file);});
          const asset=await json('PATCH',{id:target.id});
          uploaded.push(asset); onChange([...uploaded]);
        } catch (error) { failures.push(`${file.name}: ${error instanceof Error ? error.message : 'Upload failed.'}`); }
      }
      if (failures.length) setError(failures.join(' '));
    } finally { setBusy(false); setQueue(''); }
  }
  async function remove(assetId:string) { setBusy(true);setError('');try{await json('DELETE',{id:assetId});onChange(items.filter(item=>item.id!==assetId));}catch(error){setError(error instanceof Error?error.message:'Unable to remove media.');}finally{setBusy(false);} }
  return <div><p className="mb-4 text-sm">Select multiple photos at once, or add video and your own music. Media changes are saved immediately.</p><details className="mb-5"><summary className="cursor-pointer text-sm">Music ownership and playback</summary><label className="editor-label mt-4">Artist (optional)<input className="field" maxLength={120} value={artist} onChange={e=>setArtist(e.target.value)}/></label><label className="editor-label mt-4">Ownership or license (required for music)<textarea className="field" maxLength={500} value={license} onChange={e=>setLicense(e.target.value)} placeholder="For example: original music composed by me"/></label><label className="editor-checkbox mt-4"><input type="checkbox" checked={loop} onChange={e=>setLoop(e.target.checked)}/> Loop music</label></details><label className="editor-label">Upload media<input className="field" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,audio/mpeg" disabled={busy} onChange={event=>{const files=Array.from(event.target.files ?? []);event.target.value='';if(files.length)void upload(files);}}/></label><p className="mt-3 text-xs">Up to 20 files per invitation. Photos up to 8 MB, MP4 videos up to 40 MB, MP3 music up to 10 MB. Upload music you own or have permission to use.</p>{busy&&<p role="status" className="mt-4">{queue || 'Updating media'} - {progress}%</p>}{error&&<p role="alert" className="mt-4 text-red-700">{error}</p>}<ul className="mt-6 space-y-4">{items.map(item=><li key={item.id} className="rounded-xl border border-ink/15 p-3"><p className="break-all text-sm">{item.name}</p>{item.mime.startsWith('image/')&&<img src={item.url} alt={item.name} className="mt-2 max-h-32 rounded-lg" loading="lazy"/>}<button type="button" className="mt-3 text-sm underline" disabled={busy} onClick={()=>void remove(item.id)}>Remove from invitation</button></li>)}</ul><p className="mt-6 text-xs">Files stay private. Removing a file from this invitation preserves copies that use it.</p></div>;
}
