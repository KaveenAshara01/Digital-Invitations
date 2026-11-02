'use client';
import type { MediaPreview } from '@/lib/media/validation';
export function InvitationMedia({items}:{items:MediaPreview[]}) {
  if(!items.length)return null;
  const photos=items.filter(item=>item.mime.startsWith('image/'));
  const videos=items.filter(item=>item.mime.startsWith('video/'));
  const audio=items.filter(item=>item.mime.startsWith('audio/'));
  return <section className="inv-section" aria-label="Photos, video and music">{photos.length>0&&<><p className="inv-eyebrow">Captured moments</p><h3>Our gallery</h3><div className="media-photo-grid">{photos.map(item=><img key={item.id} src={item.url} alt={item.name} loading="lazy" decoding="async"/>)}</div></>}{videos.map(item=><video key={item.id} src={item.url} poster={photos[0]?.url} controls playsInline preload="none" className="mt-6 w-full rounded-2xl" aria-label={item.name}/>)}{audio.map(item=><div key={item.id} className="mt-6"><p className="inv-small">{item.name}{item.artist && ` · ${item.artist}`}</p><audio src={item.url} controls loop={item.loop ?? false} preload="none" className="mt-3 w-full" aria-label={item.name}/></div>)}</section>;
}
