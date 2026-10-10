import { templates } from '@/lib/templates/registry';
import { TemplateGallery } from '@/components/template-gallery';
export const metadata = { title: 'Find your invitation' };
export default function TemplatesPage() {
  return <div className="mx-auto max-w-6xl px-6 py-12"><div className="gallery-heading"><div><p className="text-xs tracking-[.2em] text-accent uppercase">The design collection</p><h1 className="mt-4 text-5xl md:text-6xl">Every occasion.<br/><em>Your kind of beautiful.</em></h1></div><p className="max-w-sm text-base leading-7 text-ink/70">Eight original designs, ready for your story. Pick a favourite and make every detail feel like you.</p></div><TemplateGallery templates={templates}/></div>;
}
