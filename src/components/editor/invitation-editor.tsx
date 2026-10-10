'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { invitationConfigSchema, saveInvitationSchema, type SaveInvitationInput } from '@/lib/validation/invitation';
import type { TemplateDefinition } from '@/lib/templates/registry';
import { InvitationRenderer } from '@/components/templates/invitation-renderer';
type Props = { id: string; template: TemplateDefinition; initial: SaveInvitationInput };
const panels = ['Content', 'Event', 'Style', 'Sections'] as const;
const sectionNames = { story: 'Our story', details: 'Event details', gallery: 'Photo gallery', rsvp: 'RSVP' };
function fingerprint(value: SaveInvitationInput) { return JSON.stringify({ title: value.title, configuration: value.configuration }); }
export function InvitationEditor({ id, template, initial }: Props) {
  const { register, watch, setValue, getValues, reset } = useForm<SaveInvitationInput>({ defaultValues: initial });
  const values = watch();
  const [panel, setPanel] = useState<typeof panels[number]>('Content');
  const [mobileView, setMobileView] = useState<'settings' | 'preview'>('settings');
  const [wide, setWide] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(fingerprint(initial));
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [revealKey, setRevealKey] = useState(0);
  const inFlight = useRef(false);
  const dirty = fingerprint(values) !== saved;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (inFlight.current) return;
    const result = saveInvitationSchema.safeParse(getValues());
    if (!result.success) { setError(`${result.error.issues[0]?.path.join(' → ')}: ${result.error.issues[0]?.message}`); return; }
    const snapshot = result.data;
    inFlight.current = true; setSaving(true); setError(''); setConflict(false);
    try {
      const response = await fetch(`/api/invitations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(snapshot) });
      const body = await response.json();
      if (!response.ok) { setConflict(body.error?.code === 'REVISION_CONFLICT'); throw new Error(body.error?.message ?? 'Unable to save your draft.'); }
      setValue('revision', body.data.revision); setSaved(fingerprint(snapshot));
      // Keep any edits made during the request; only the sent snapshot is marked saved.
    } catch(error) { setError(error instanceof Error ? error.message : 'Unable to connect. Your edits are still here; try saving again.'); }
    finally { inFlight.current = false; setSaving(false); }
  }
  async function loadLatest() {
    if (!window.confirm('Replace your unsaved edits with the latest saved draft?')) return;
    setError('');
    try {
      const response = await fetch(`/api/invitations/${id}`, { cache: 'no-store' }); const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Unable to load your draft.');
      const data = { title: result.data.title, revision: result.data.revision, configuration: invitationConfigSchema.parse(result.data.configuration) };
      reset(data); setSaved(fingerprint(data)); setConflict(false);
    } catch { setError('Unable to load the saved draft. Please try again.'); }
  }
  function moveSection(index: number, direction: number) {
    const sections = [...getValues('configuration.sections')]; const destination = index + direction;
    if (destination < 0 || destination >= sections.length) return;
    [sections[index], sections[destination]] = [sections[destination], sections[index]];
    setValue('configuration.sections', sections, { shouldDirty: true });
  }
  const field = (label: string, name: Parameters<typeof register>[0], options: { type?: string; maxLength?: number; required?: boolean } = {}) => <label className="editor-label" key={name}>{label}<input className="field" {...options} {...register(name)}/></label>;
  const textarea = (label: string, name: Parameters<typeof register>[0], maxLength: number, rows = 3) => <label className="editor-label" key={name}>{label}<textarea className="field" rows={rows} maxLength={maxLength} {...register(name)}/></label>;
  return <form onSubmit={save} className="editor-workspace"><div className="editor-toolbar"><div className="flex min-w-0 items-center gap-4"><Link href="/dashboard" aria-label="Back to invitations" className="editor-back" onClick={e=>{if(dirty && !window.confirm('Leave without saving your changes?'))e.preventDefault();}}>←</Link><div className="min-w-0"><h1 className="truncate text-xl">{values.title || 'Your invitation'}</h1><p className="text-xs text-ink/60">{template.name} <span aria-hidden="true">·</span> Private draft</p></div></div><div className="flex items-center gap-3"><p role="status" aria-live="polite" className="text-xs text-ink/70">{saving ? 'Saving…' : dirty ? 'Unsaved changes' : 'Saved'}</p><button className="button editor-save" disabled={saving || !dirty || conflict}>{saving ? 'Saving…' : 'Save draft'}</button></div></div>{error && <div role="alert" className="editor-error"><p>{error}</p>{conflict && <button type="button" className="underline" onClick={loadLatest}>Load saved version</button>}</div>}<div className="editor-mobile-toggle"><button type="button" aria-pressed={mobileView === 'settings'} onClick={()=>setMobileView('settings')}>Edit details</button><button type="button" aria-pressed={mobileView === 'preview'} onClick={()=>setMobileView('preview')}>Live preview</button></div><div className="editor-layout"><aside className={`editor-controls ${mobileView === 'preview' ? 'mobile-hidden' : ''}`}><div className="editor-panel-tabs" aria-label="Editing panels">{panels.map(name=><button type="button" key={name} aria-pressed={panel === name} onClick={()=>setPanel(name)}>{name}</button>)}</div><div className="editor-panel"><p className="editor-panel-heading">{panel === 'Content' ? 'Tell your story' : panel === 'Event' ? 'Set the scene' : panel === 'Style' ? 'Make it feel like you' : 'Build your invitation'}</p>
    {panel === 'Content' && <>{field('Dashboard name', 'title', { maxLength: 120, required: true })}{field('Couple or host names', 'configuration.hosts', { maxLength: 120, required: true })}{field('Event title', 'configuration.eventTitle', { maxLength: 120, required: true })}{textarea('Opening message', 'configuration.greeting', 200, 2)}{textarea('Your story or description', 'configuration.description', 2000, 5)}<div className="editor-tip">Your words appear in the preview as you type. Save your draft before leaving.</div></>}
    {panel === 'Event' && <>{field('Date and time', 'configuration.dateTime', { type: 'datetime-local' })}<label className="editor-label">Time zone<select className="field" {...register('configuration.timeZone')}>{Array.from(new Set(['Asia/Colombo', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney', 'UTC', values.configuration.timeZone])).map(zone=><option key={zone} value={zone}>{zone.replace(/_/g,' ')}</option>)}</select></label>{field('Venue', 'configuration.venue', { maxLength: 180 })}{textarea('Address', 'configuration.address', 300, 2)}{field('Map link (HTTPS)', 'configuration.mapUrl', { type: 'url', maxLength: 1000 })}{field('Dress code', 'configuration.dressCode', { maxLength: 180 })}{textarea('Anything else guests should know', 'configuration.extraInfo', 1500)}<label className="editor-checkbox"><input type="checkbox" {...register('configuration.countdown')}/> Show countdown</label></>}
    {panel === 'Style' && <><fieldset><legend className="editor-label">Your palette</legend><div className="editor-palette">{(['background', 'ink', 'accent'] as const).map(key=><label key={key} className="editor-color"><input type="color" {...register(`configuration.theme.${key}`)} aria-label={`${key} colour`}/><span>{key === 'ink' ? 'Text' : key[0].toUpperCase()+key.slice(1)}</span><small>{values.configuration.theme[key]}</small></label>)}</div></fieldset><label className="editor-label">Typography<select className="field" {...register('configuration.theme.font')}><option value="classic">Classic · Georgia</option><option value="romantic">Romantic · Palatino</option><option value="modern">Modern · Sans serif</option></select></label><label className="editor-label">Heading size · {Math.round(values.configuration.theme.headingScale * 100)}%<input type="range" min="0.75" max="1.5" step="0.05" className="mt-4 w-full accent-ink" {...register('configuration.theme.headingScale', { valueAsNumber: true })}/></label>{template.cinematic && <label className="editor-label">Opening behaviour<select className="field" {...register('configuration.opening')}><option value="reveal">Show door-opening reveal</option><option value="skip">Go straight to the invitation</option></select></label>}<div className="editor-tip">Fonts use built-in fallbacks so your invitation loads quickly. Keep text and background colours easy to read.</div></>}
    {panel === 'Sections' && <><p className="mb-6 text-xs leading-5 text-ink/70">Show the sections you want, then arrange them in the order your story unfolds.</p><div className="editor-sections">{values.configuration.sections.map((section,index)=><div className="editor-section-row" key={section.id}><label className="editor-checkbox"><input type="checkbox" checked={section.visible} onChange={e=>{const sections = [...getValues('configuration.sections')];sections[index] = {...section,visible:e.target.checked};setValue('configuration.sections',sections,{shouldDirty:true});}}/>{sectionNames[section.id]}</label><div className="flex gap-1"><button type="button" disabled={index === 0} aria-label={`Move ${sectionNames[section.id]} up`} onClick={()=>moveSection(index,-1)}>↑</button><button type="button" disabled={index === values.configuration.sections.length - 1} aria-label={`Move ${sectionNames[section.id]} down`} onClick={()=>moveSection(index,1)}>↓</button></div></div>)}</div><label className="editor-checkbox mt-6"><input type="checkbox" {...register('configuration.rsvp.enabled')}/> Include RSVP information</label>{textarea('RSVP note', 'configuration.rsvp.note', 300)}<div className="editor-tip">Photo uploads arrive with the media tools. Guest links and RSVP responses arrive with guest management. You can arrange these sections now.</div></>}
    </div></aside><section className={`editor-preview-area ${mobileView === 'settings' ? 'mobile-hidden' : ''}`} aria-label="Live invitation preview"><div className="editor-preview-toolbar"><span className="text-xs tracking-widest uppercase">Live preview</span><div className="flex gap-2"><button type="button" aria-pressed={!wide} onClick={()=>setWide(false)}>Mobile</button><button type="button" aria-pressed={wide} onClick={()=>setWide(true)}>Wide</button><button type="button" onClick={()=>setRevealKey(key=>key+1)}>Replay</button></div></div><div className={`editor-preview-canvas ${wide ? 'preview-wide' : ''}`}><InvitationRenderer key={revealKey} template={template} configuration={values.configuration} showOpening={false}/></div>{template.cinematic && <details className="editor-opening-preview" key={revealKey}><summary>Preview the door-opening experience</summary><InvitationRenderer template={template} configuration={values.configuration}/></details>}<p className="mt-6 text-center text-xs text-ink/60">Only you can see this draft.</p></section></div></form>;
}
