// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InvitationEditor } from '../src/components/editor/invitation-editor';
import { freshConfiguration, templates } from '../src/lib/templates/registry';
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});

test('autosave debounces changes and saves newer edits after an in-flight request',async()=>{
  vi.useFakeTimers();
  let complete!: (response: Response)=>void;
  const request=vi.fn().mockImplementation(()=>new Promise<Response>(resolve=>{complete=resolve;}));
  vi.stubGlobal('fetch',request);
  render(<InvitationEditor id="draft" template={templates[0]} initial={{title:'Wedding',revision:0,configuration:freshConfiguration(templates[0])}}/>);
  fireEvent.change(screen.getByLabelText('Couple or host names'),{target:{value:'First names'}});
  await act(()=>vi.advanceTimersByTimeAsync(800));
  fireEvent.change(screen.getByLabelText('Couple or host names'),{target:{value:'Updated names'}});
  await act(()=>vi.advanceTimersByTimeAsync(1199));expect(request).not.toHaveBeenCalled();
  await act(()=>vi.advanceTimersByTimeAsync(1));expect(request).toHaveBeenCalledTimes(1);
  expect(JSON.parse(request.mock.calls[0][1].body).configuration.hosts).toBe('Updated names');
  fireEvent.change(screen.getByLabelText('Couple or host names'),{target:{value:'Latest names'}});
  await act(()=>vi.advanceTimersByTimeAsync(2000));expect(request).toHaveBeenCalledTimes(1);
  await act(async()=>{complete(Response.json({data:{revision:1}}));});
  expect(screen.getByRole('status').textContent).toBe('Unsaved changes');
  await act(()=>vi.advanceTimersByTimeAsync(1200));expect(request).toHaveBeenCalledTimes(2);
  expect(JSON.parse(request.mock.calls[1][1].body)).toMatchObject({revision:1,configuration:{hosts:'Latest names'}});
  await act(async()=>{complete(Response.json({data:{revision:2}}));});
  expect(screen.getByRole('status').textContent).toBe('Saved');
});

test('a stale-tab conflict stops autosave without dropping edits or retrying forever',async()=>{
  vi.useFakeTimers();
  const request=vi.fn().mockResolvedValue(Response.json({error:{code:'REVISION_CONFLICT',message:'Draft changed in another tab'}},{status:409}));vi.stubGlobal('fetch',request);
  render(<InvitationEditor id="draft" template={templates[0]} initial={{title:'Wedding',revision:0,configuration:freshConfiguration(templates[0])}}/>);
  fireEvent.change(screen.getByLabelText('Couple or host names'),{target:{value:'My unsaved names'}});
  await act(()=>vi.advanceTimersByTimeAsync(1200));
  expect(screen.getByRole('alert').textContent).toContain('Draft changed');
  await act(()=>vi.advanceTimersByTimeAsync(10000));expect(request).toHaveBeenCalledTimes(1);
  expect((screen.getByLabelText('Couple or host names') as HTMLInputElement).value).toBe('My unsaved names');
});
