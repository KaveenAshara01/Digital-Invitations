'use client';
import { useEffect, useRef, useState } from 'react';
import { musicTracks, musicLicenseUrl, musicSource, type MusicSettings } from '@/lib/media/music';
import type { MediaPreview } from '@/lib/media/validation';

export function MusicCredit({ track }: { track: typeof musicTracks[number] }) {
  return <p className="mt-2 text-xs leading-5">{track.title} by <a className="underline" href={musicSource(track.isrc)} target="_blank" rel="noopener noreferrer">Kevin MacLeod (incompetech.com)</a> · <a className="underline" href={musicLicenseUrl} target="_blank" rel="noopener noreferrer">CC BY 4.0</a></p>;
}

export function InvitationMusicCredit({ settings }: { settings?: MusicSettings }) {
  const track = settings?.enabled && musicTracks.find(track => track.id === settings.trackId);
  return track ? <details className="inv-music-credit"><summary>Music credits</summary><MusicCredit track={track}/></details> : null;
}

function MusicButton({ src }: { src: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const chosen = useRef(false);
  const playing = useRef(false);
  const [audible, setAudible] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const player = audio.current!;
    let disposed = false;
    const start = () => {
      if (chosen.current || playing.current) return;
      player.muted = false;
      void player.play().then(() => {
        if (disposed) return;
        playing.current = true;
        setAudible(!player.muted);
      }).catch(() => { /* Browsers may require a guest interaction. */ });
    };
    const root = host.current?.closest('article') ?? host.current;
    const interact = (event: Event) => {
      if (host.current?.contains(event.target as Node)) return;
      if (event instanceof KeyboardEvent && event.key !== 'Enter' && event.key !== ' ') return;
      start();
    };
    start();
    root?.addEventListener('click', interact);
    root?.addEventListener('keydown', interact);
    return () => { disposed = true; root?.removeEventListener('click', interact); root?.removeEventListener('keydown', interact); player.pause(); };
  }, []);
  async function toggle() {
    const player = audio.current!;
    chosen.current = true;
    setFailed(false);
    if (audible) { player.muted = true; setAudible(false); return; }
    player.muted = false;
    try { await player.play(); playing.current = true; setAudible(true); }
    catch { setAudible(false); setFailed(true); }
  }
  return <div className="inv-music-control" ref={host}>
    <audio ref={audio} src={src} loop preload="none" hidden onError={() => { playing.current = false; setAudible(false); setFailed(true); }}/>
    <button type="button" className="inv-music-button" aria-label={audible ? 'Mute music' : 'Unmute music'} aria-pressed={audible} title={audible ? 'Mute music' : 'Unmute music'} onClick={() => void toggle()}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"/>{audible ? <path d="M15 8c2 2 2 6 0 8M18 5c4 4 4 10 0 14"/> : <path d="m16 9 6 6m0-6-6 6"/>}</svg>
    </button>
    {failed && <span className="inv-music-error" role="status">Music unavailable. Tap to retry.</span>}
  </div>;
}

export function InvitationMusic({ settings, media = [] }: { settings?: MusicSettings; media?: MediaPreview[] }) {
  if (settings && !settings.enabled) return null;
  const track = settings?.enabled && musicTracks.find(track => track.id === settings.trackId);
  const uploaded = (!settings || settings.trackId === 'uploaded') && media.find(item => item.mime.startsWith('audio/'));
  const src = track ? `/music/${track.file}` : uploaded ? uploaded.url : undefined;
  return src ? <MusicButton key={src} src={src}/> : null;
}
