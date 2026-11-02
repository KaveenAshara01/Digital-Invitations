'use client';
import { defaultMusic, musicTracks, type MusicSettings as Settings } from '@/lib/media/music';
import { MusicCredit } from '../templates/invitation-music';

export function MusicSettings({ value = defaultMusic, onChange }: { value?: Settings; onChange: (value: Settings) => void }) {
  const track = musicTracks.find(track => track.id === value.trackId);
  return <fieldset className="mb-7 border-b border-ink/15 pb-6"><legend className="editor-label">Invitation music</legend>
    <label className="editor-checkbox"><input type="checkbox" checked={value.enabled} onChange={event => onChange({ ...value, enabled: event.target.checked })}/> Include music</label>
    <p className="mt-2 text-xs leading-5">Optional. Music loops with a small mute/unmute button. Music settings save automatically.</p>
    {value.enabled && <><label className="editor-label mt-4">Choose a track<select className="field" value={value.trackId} onChange={event => onChange({ ...value, trackId: event.target.value as Settings['trackId'] })}>{musicTracks.map(track => <option key={track.id} value={track.id}>{track.title}</option>)}<option value="uploaded">My uploaded music</option></select></label>
      {track ? <div className="mt-3"><p className="text-xs">{track.mood}</p><audio key={track.id} src={`/music/${track.file}`} controls preload="none" className="mt-3 w-full" aria-label={`Preview ${track.title}`}/><MusicCredit track={track}/><p className="mt-2 text-xs">Free to use; the artist credit is included on your invitation.</p></div> : <p className="mt-3 text-xs">Upload an MP3 below and describe your ownership or license. Your first uploaded MP3 is used as background music.</p>}

    </>}
  </fieldset>;
}
