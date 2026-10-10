import { expect, test } from 'vitest';
import { templates, freshConfiguration } from '../src/lib/templates/registry';
import { invitationConfigSchema } from '../src/lib/validation/invitation';
import { eventInstant } from '../src/lib/templates/time';
import { safeReturnPath } from '../src/lib/auth/return-path';
test('all eight original templates have valid, independent versioned defaults', () => {
  expect(templates).toHaveLength(8); expect(new Set(templates.map(t=>t.kind)).size).toBe(8);
  expect(new Set(templates.map(t=>t.slug)).size).toBe(8);
  for (const template of templates) expect(invitationConfigSchema.safeParse(template.defaults).success).toBe(true);
  const copy = freshConfiguration(templates[0]); copy.theme.background = '#000000'; copy.sections.reverse();
  expect(templates[0].defaults.theme.background).toBe('#faf7f0'); expect(templates[0].defaults.sections[0].id).toBe('story');
});
test('configuration rejects script URLs, unsafe CSS values, invalid dates and duplicate sections', () => {
  const config = freshConfiguration(templates[0]);
  for (const mapUrl of ['javascript:alert(1)', 'data:text/html,test', 'http://example.com']) expect(invitationConfigSchema.safeParse({...config,mapUrl}).success).toBe(false);
  expect(invitationConfigSchema.safeParse({...config,theme:{...config.theme,background:'red;position:fixed'}}).success).toBe(false);
  expect(invitationConfigSchema.safeParse({...config,dateTime:'2027-02-30T12:00'}).success).toBe(false);
  expect(invitationConfigSchema.safeParse({...config,timeZone:'Invalid/Zone'}).success).toBe(false);
  expect(invitationConfigSchema.safeParse({...config,sections:config.sections.map(()=>({id:'story',visible:true}))}).success).toBe(false);
});
test('countdown uses the selected event zone rather than the browser zone', () => {
  expect(eventInstant({ dateTime:'2027-02-14T18:30',timeZone:'Asia/Colombo' })).toBe(Date.UTC(2027,1,14,13,0));
  expect(eventInstant({ dateTime:'2027-07-14T18:30',timeZone:'America/New_York' })).toBe(Date.UTC(2027,6,14,22,30));
  expect(eventInstant({ dateTime:'2027-03-14T02:30',timeZone:'America/New_York' })).toBeNull();
});
test('login preserves a selected template without accepting external redirect destinations', () => {
  expect(safeReturnPath('/invitations/new?template=ivory-vows')).toBe('/invitations/new?template=ivory-vows');
  for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '/api/auth/sign-out']) expect(safeReturnPath(value)).toBe('/dashboard');
});
