// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { InvitationEditor } from '../src/components/editor/invitation-editor';
import { InvitationRenderer } from '../src/components/templates/invitation-renderer';
import { TemplateGallery } from '../src/components/template-gallery';
import { templates, freshConfiguration } from '../src/lib/templates/registry';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
test('animated invitations can pause and replay without changing editable content', async () => {
  const user = userEvent.setup(); render(<InvitationRenderer template={templates[3]} configuration={freshConfiguration(templates[3])}/>);
  const heading = screen.getByRole('heading',{name:'Amaya & Kavin'});
  await user.click(screen.getByRole('button',{name:'Pause animations'}));
  expect(document.querySelector('.animated-invitation')?.classList.contains('motion-stopped')).toBe(true);
  expect((screen.getByRole('button',{name:'Replay animations'}) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole('button',{name:'Play animations'}));
  await user.click(screen.getByRole('button',{name:'Replay animations'}));
  expect(screen.getByRole('heading',{name:'Amaya & Kavin'})).not.toBe(heading);
});
test('reduced-motion preferences keep content visible and disable decorative playback', async () => {
  vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
  render(<InvitationRenderer template={templates[4]} configuration={freshConfiguration(templates[4])}/>);
  await waitFor(()=>expect(screen.getByText('Reduced motion')).toBeTruthy());
  expect(screen.getByRole('heading',{name:'Maya turns 30'})).toBeTruthy();
  expect((screen.getByRole('button',{name:'Pause animations'}) as HTMLButtonElement).disabled).toBe(true);
});
test('gallery loads an animated design only when its preview is requested', async () => {
  const user = userEvent.setup(); render(<TemplateGallery templates={templates}/>);
  expect(document.querySelector('.animated-invitation')).toBeNull();
  await user.click(screen.getAllByRole('button',{name:'Animate preview'})[0]);
  expect(document.querySelectorAll('.animated-invitation')).toHaveLength(1);
  await user.click(screen.getByRole('button',{name:'Close animated preview'}));
  expect(document.querySelector('.animated-invitation')).toBeNull();
});
function renderEditor(index = 0) { return render(<InvitationEditor id="test-draft" template={templates[index]} initial={{title:'Our wedding',revision:0,configuration:freshConfiguration(templates[index])}}/>); }
test('editing names updates the live preview immediately and marks unsaved changes', async () => {
  const user = userEvent.setup(); renderEditor();
  await user.clear(screen.getByLabelText('Couple or host names')); await user.type(screen.getByLabelText('Couple or host names'), 'Nimal & Dilhani');
  expect(screen.getByRole('heading',{name:'Nimal & Dilhani'})).toBeTruthy(); expect(screen.getByRole('status').textContent).toBe('Unsaved changes');
});
test('saving sends the configuration and preserves edits made during an in-flight save', async () => {
  const user = userEvent.setup(); let finish!: (response: Response) => void;
  const fetchMock = vi.fn((_url: string, _options: RequestInit)=>new Promise<Response>(resolve=>{finish=resolve;})); vi.stubGlobal('fetch',fetchMock); renderEditor();
  await user.clear(screen.getByLabelText('Couple or host names')); await user.type(screen.getByLabelText('Couple or host names'),'First edit');
  await user.click(screen.getByRole('button',{name:'Save draft'})); expect(screen.getByRole('status').textContent).toBe('Saving…');
  const sent = JSON.parse(fetchMock.mock.calls[0][1].body as string); expect(sent.configuration.hosts).toBe('First edit'); expect(sent.revision).toBe(0);
  await user.clear(screen.getByLabelText('Couple or host names')); await user.type(screen.getByLabelText('Couple or host names'),'Second edit');
  finish(Response.json({data:{id:'test-draft',revision:1}}));
  await waitFor(()=>expect(screen.getByRole('status').textContent).toBe('Unsaved changes'));
  expect(screen.getByRole('heading',{name:'Second edit'})).toBeTruthy();
  await user.click(screen.getByRole('button',{name:'Save draft'}));
  const second = JSON.parse(fetchMock.mock.calls[1][1].body as string); expect(second.revision).toBe(1); expect(second.configuration.hosts).toBe('Second edit');
  finish(Response.json({data:{revision:2}})); await waitFor(()=>expect(screen.getByRole('status').textContent).toBe('Saved'));
});
test('failed saves retain edits and offer retry; successful retry marks them saved', async () => {
  const user = userEvent.setup(); const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({error:{message:'Please retry'}},{status:500})).mockResolvedValueOnce(Response.json({data:{revision:1}})); vi.stubGlobal('fetch',fetchMock); renderEditor();
  await user.type(screen.getByLabelText('Event title'),'!'); await user.click(screen.getByRole('button',{name:'Save draft'}));
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Please retry'));
  expect(screen.getByRole('status').textContent).toBe('Unsaved changes');
  await user.click(screen.getByRole('button',{name:'Save draft'})); await waitFor(()=>expect(screen.getByRole('status').textContent).toBe('Saved'));
});
test('section visibility, order and palette update the shared preview', async () => {
  const user = userEvent.setup(); renderEditor(); await user.click(screen.getByRole('button',{name:'Style'}));
  fireEvent.change(screen.getByLabelText('accent colour'),{target:{value:'#112233'}});
  expect(screen.getByRole('article').style.getPropertyValue('--inv-accent')).toBe('#112233');
  await user.click(screen.getByRole('button',{name:'Sections'}));
  await user.click(screen.getByLabelText('Our story')); expect(screen.queryByRole('heading',{name:'Some moments deserve good company.'})).toBeNull();
  await user.click(screen.getByLabelText('Photo gallery')); expect(screen.getByRole('heading',{name:'A story in pictures.'})).toBeTruthy();
  await user.click(screen.getByRole('button',{name:'Move Photo gallery up'}));
  const labels = Array.from(document.querySelectorAll('.editor-section-row label')).map(e=>e.textContent); expect(labels).toEqual(['Our story','Photo gallery','Event details','RSVP']);
});
test('cinematic template opens and replays without requiring audio or autoplay', async () => {
  const user = userEvent.setup(); render(<InvitationRenderer template={templates[1]} configuration={freshConfiguration(templates[1])}/>);
  expect(document.querySelector('.cinematic-stage')?.classList.contains('is-open')).toBe(false);
  await user.click(screen.getByRole('button',{name:'Open the invitation'})); expect(document.querySelector('.cinematic-stage')?.classList.contains('is-open')).toBe(true);
  await user.click(screen.getByRole('button',{name:'Replay opening'})); expect(document.querySelector('.cinematic-stage')?.classList.contains('is-open')).toBe(false);
});
test('gallery filtering and search work without downloading template videos', async () => {
  const user = userEvent.setup(); render(<TemplateGallery templates={templates}/>);
  expect(screen.getAllByRole('article')).toHaveLength(8);
  await user.click(screen.getByRole('button',{name:'Birthday'})); expect(screen.getAllByRole('article')).toHaveLength(1);
  await user.type(screen.getByRole('searchbox'),'unmatched'); expect(screen.queryAllByRole('article')).toHaveLength(0);
  await user.click(screen.getByRole('button',{name:'Show all designs'})); expect(screen.getAllByRole('article')).toHaveLength(8); expect(document.querySelector('video')).toBeNull();
});
test('a stale-tab conflict requires loading the latest draft before saving', async () => {
  const user = userEvent.setup(); const configuration = freshConfiguration(templates[0]); configuration.hosts = 'Latest saved names';
  vi.spyOn(window,'confirm').mockReturnValueOnce(true);
  const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({error:{code:'REVISION_CONFLICT',message:'Another tab changed this draft'}},{status:409})).mockResolvedValueOnce(Response.json({data:{title:'Latest title',revision:2,configuration}}));
  vi.stubGlobal('fetch',fetchMock); renderEditor();
  await user.type(screen.getByLabelText('Event title'),'!'); await user.click(screen.getByRole('button',{name:'Save draft'}));
  await waitFor(()=>expect(screen.getByRole('alert').textContent).toContain('Another tab'));
  expect((screen.getByRole('button',{name:'Save draft'}) as HTMLButtonElement).disabled).toBe(true);
  await user.click(screen.getByRole('button',{name:'Load saved version'}));
  await waitFor(()=>expect(screen.getByRole('heading',{name:'Latest saved names'})).toBeTruthy());
  expect(screen.getByRole('status').textContent).toBe('Saved'); vi.restoreAllMocks();
});
