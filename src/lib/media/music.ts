export const musicTrackIds = ['canon-strings', 'canon-harps', 'air-prelude', 'uploaded'] as const;
export type MusicSettings = { enabled: boolean; trackId: typeof musicTrackIds[number]; loop: boolean };
export const musicTracks = [
  { id: 'canon-strings', title: 'Canon in D Major', mood: 'Classic ceremony · violin and harp', file: 'canon-strings.mp3', isrc: 'USUAN1100301' },
  { id: 'canon-harps', title: 'Canon in D for Two Harps', mood: 'Gentle ceremony · concert harps', file: 'canon-harps.mp3', isrc: 'USUAN2000015' },
  { id: 'air-prelude', title: 'Air Prelude', mood: 'Soft instrumental · a quiet romantic moment', file: 'air-prelude.mp3', isrc: 'USUAN1100337' },
] as const;
export const musicLicenseUrl = 'https://creativecommons.org/licenses/by/4.0/';
export function musicSource(isrc: string) { return `https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=${isrc}`; }
export const defaultMusic: MusicSettings = { enabled: false, trackId: 'canon-strings', loop: true };
