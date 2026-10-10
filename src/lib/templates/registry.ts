import type { InvitationConfig, SectionId } from '@/lib/validation/invitation';
export const categories = ['Wedding', 'Birthday', 'Engagement', 'Celebration'] as const;
export type TemplateDefinition = {
  id: string; slug: string; name: string; description: string;
  category: typeof categories[number]; version: number; previewImage: string;
  kind: 'elegant' | 'cinematic' | 'minimal' | 'floral' | 'birthday' | 'engagement' | 'traditional' | 'photo';
  supportedSections: readonly SectionId[]; cinematic: boolean; defaults: InvitationConfig;
};
const base: InvitationConfig = {
  schemaVersion: 1, hosts: 'Amaya & Kavin', eventTitle: 'Together, always', greeting: 'With full hearts, we invite you to celebrate',
  description: 'A new chapter, surrounded by the people we love. Join us for an evening of laughter, beautiful memories, and a little dancing.',
  dateTime: '', timeZone: 'Asia/Colombo', venue: 'The Garden House', address: 'Colombo, Sri Lanka', mapUrl: '', dressCode: 'Garden formal', extraInfo: 'We cannot wait to celebrate with you.',
  theme: { background: '#faf7f0', ink: '#243e36', accent: '#a26945', font: 'classic', headingScale: 1 },
  countdown: true, opening: 'reveal', rsvp: { enabled: false, note: 'Please let us know if you can join us.' },
  sections: [{ id: 'story', visible: true }, { id: 'details', visible: true }, { id: 'gallery', visible: false }, { id: 'rsvp', visible: false }],
};
function define(input: Omit<TemplateDefinition, 'id' | 'version' | 'previewImage' | 'supportedSections' | 'defaults' | 'cinematic'>, changes: Partial<InvitationConfig> = {}): TemplateDefinition {
  return { ...input, id: input.slug, version: 1, previewImage: `/templates/${input.kind}.svg`, supportedSections: ['story', 'details', 'gallery', 'rsvp'], cinematic: input.kind === 'cinematic', defaults: { ...structuredClone(base), ...changes } };
}
export const templates: readonly TemplateDefinition[] = [
  define({ slug: 'ivory-vows', name: 'Ivory vows', kind: 'elegant', category: 'Wedding', description: 'An ivory arch, fine botanical lines, and timeless serif lettering.' }),
  define({ slug: 'after-the-doors', name: 'After the doors', kind: 'cinematic', category: 'Wedding', description: 'A midnight palette and golden doors that open into your celebration.' }, { theme: { background: '#192d30', ink: '#fff5df', accent: '#d3ac68', font: 'romantic', headingScale: 1.1 } }),
  define({ slug: 'just-us', name: 'Just us', kind: 'minimal', category: 'Celebration', description: 'Bold type, generous space, and a beautifully understated invitation.' }, { hosts: 'The Perera family', eventTitle: 'Good company. Great evening.', theme: { background: '#f4f1eb', ink: '#262626', accent: '#6b7569', font: 'modern', headingScale: 1.1 }, dressCode: 'Come as you are' }),
  define({ slug: 'wildflower-letter', name: 'Wildflower letter', kind: 'floral', category: 'Wedding', description: 'Hand-drawn blooms and soft rose tones, like a letter from the garden.' }, { theme: { background: '#fff6f2', ink: '#583e44', accent: '#a34f68', font: 'romantic', headingScale: 1 } }),
  define({ slug: 'another-trip-around', name: 'Another trip around', kind: 'birthday', category: 'Birthday', description: 'Playful shapes, confetti, and a sunny burst of birthday energy.' }, { hosts: 'Maya turns 30', eventTitle: 'Let’s make a little noise', greeting: 'You are invited to a birthday celebration', description: 'Another year around the sun calls for cake, music, and all our favourite people.', theme: { background: '#fff5dc', ink: '#472944', accent: '#a94b31', font: 'modern', headingScale: 1 }, dressCode: 'A splash of colour' }),
  define({ slug: 'the-first-yes', name: 'The first yes', kind: 'engagement', category: 'Engagement', description: 'Interlocking rings, a blush canvas, and the promise of a new beginning.' }, { eventTitle: 'We said yes', greeting: 'Celebrate our engagement with us', theme: { background: '#f5eae7', ink: '#603e36', accent: '#986044', font: 'romantic', headingScale: 1 } }),
  define({ slug: 'golden-gathering', name: 'Golden gathering', kind: 'traditional', category: 'Celebration', description: 'A rich ceremonial border and warm gold details for a special gathering.' }, { hosts: 'The Jayawardena family', eventTitle: 'A celebration of togetherness', theme: { background: '#542e32', ink: '#fff5dc', accent: '#edc78b', font: 'classic', headingScale: 1 }, dressCode: 'Traditional attire welcome' }),
  define({ slug: 'our-story-in-frames', name: 'Our story in frames', kind: 'photo', category: 'Wedding', description: 'An editorial layout with room for your cover photo and shared memories.' }, { theme: { background: '#e9ede6', ink: '#263d35', accent: '#646747', font: 'classic', headingScale: 1 }, sections: base.sections.map(section => ({ ...section, visible: section.id !== 'rsvp' })) }),
];
export function getTemplate(slug: string) { return templates.find(template => template.slug === slug); }
export function getTemplateByVersionId(id: string | null) { return templates.find(template => `${template.id}:${template.version}` === id); }
export function freshConfiguration(template: TemplateDefinition): InvitationConfig { return structuredClone(template.defaults); }
