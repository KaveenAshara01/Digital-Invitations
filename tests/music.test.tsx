// @vitest-environment jsdom
import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvitationEditor } from '../src/components/editor/invitation-editor';
import { InvitationRenderer } from '../src/components/templates/invitation-renderer';
import { freshConfiguration, templates } from '../src/lib/templates/registry';
import { invitationConfigSchema } from '../src/lib/validation/invitation';

beforeEach(()=>{vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();vi.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});

test('music choice saves with the draft, and switching it off removes guest playback',async()=>{
  const user=userEvent.setup();
  const request=vi.fn().mockResolvedValue(Response.json({data:{revision:1}}));vi.stubGlobal('fetch',request);
  render(<InvitationEditor id="draft" template={templates[0]} initial={{title:'Our wedding',revision:0,configuration:freshConfiguration(templates[0])}}/>);
  await user.click(screen.getByRole('button',{name:'Media'}));
  expect(document.querySelector('audio')).toBeNull();
  await user.click(screen.getByLabelText('Include music'));
  await user.selectOptions(screen.getByLabelText('Choose a track'),'canon-harps');
  const player=document.querySelector('article audio')!;
  expect(player.getAttribute('src')).toBe('/music/canon-harps.mp3');
  expect(player.hasAttribute('autoplay')).toBe(false);
  expect(player.getAttribute('preload')).toBe('none');
  expect(player.hasAttribute('controls')).toBe(false);
  expect(player.hasAttribute('hidden')).toBe(true);
  expect(player.hasAttribute('loop')).toBe(true);
  await waitFor(()=>expect(screen.getByRole('button',{name:'Mute music'})).toBeTruthy());
  expect(screen.getAllByRole('link',{name:'CC BY 4.0'}).length).toBeGreaterThan(0);
  await user.click(screen.getByRole('button',{name:'Save draft'}));
  await waitFor(()=>expect(request).toHaveBeenCalledTimes(1));
  expect(JSON.parse(request.mock.calls[0][1].body).configuration.music).toEqual({enabled:true,trackId:'canon-harps',loop:true});
  await user.click(screen.getByLabelText('Include music'));
  expect(document.querySelector('audio')).toBeNull();
});

test('music can play independently of Gallery, and unsafe track IDs are rejected',()=>{
  const config=freshConfiguration(templates[0]);
  config.music={enabled:true,trackId:'air-prelude',loop:false};
  expect(config.sections.find(section=>section.id==='gallery')?.visible).toBe(false);
  render(<InvitationRenderer template={templates[0]} configuration={config}/>);
  expect(document.querySelector('article audio')?.hasAttribute('loop')).toBe(true);
  expect(invitationConfigSchema.safeParse({...config,music:{...config.music,trackId:'https://example.com/untrusted.mp3'}}).success).toBe(false);
});

test('autoplay denial waits for interaction, and mute persists through later clicks',async()=>{
  const play=vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new DOMException('Interaction required','NotAllowedError')).mockResolvedValue();
  const config=freshConfiguration(templates[0]);config.music={enabled:true,trackId:'air-prelude',loop:false};
  render(<InvitationRenderer template={templates[0]} configuration={config}/>);
  await waitFor(()=>expect(play).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('button',{name:'Unmute music'})).toBeTruthy();
  fireEvent.click(screen.getByRole('heading',{name:config.hosts}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Mute music'})).toBeTruthy());
  const audio=document.querySelector('article audio') as HTMLAudioElement;
  const user=userEvent.setup();
  await user.click(screen.getByRole('button',{name:'Mute music'}));
  expect(audio.muted).toBe(true);
  fireEvent.click(screen.getByRole('heading',{name:config.hosts}));
  expect(audio.muted).toBe(true);
  await user.click(screen.getByRole('button',{name:'Unmute music'}));
  await waitFor(()=>expect(audio.muted).toBe(false));
  expect(screen.queryByText('A little music for our day')).toBeNull();
});

test('uploaded music uses one compact looping control without a gallery player',()=>{
  const config=freshConfiguration(templates[0]);config.music={enabled:true,trackId:'uploaded',loop:false};
  render(<InvitationRenderer template={templates[0]} configuration={config} media={[{id:'music',name:'Our song',mime:'audio/mpeg',url:'https://example.com/song.mp3'}]}/>);
  const audio=document.querySelectorAll('article audio');
  expect(audio).toHaveLength(1);
  expect(audio[0].getAttribute('src')).toBe('https://example.com/song.mp3');
  expect(audio[0].hasAttribute('controls')).toBe(false);
  expect(audio[0].hasAttribute('loop')).toBe(true);
});
