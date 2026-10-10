import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = { title: { default: 'Gather · Digital invitations', template: '%s · Gather' }, description: 'Thoughtful invitations for the moments that bring us together.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><a className="sr-only focus:not-sr-only" href="#main">Skip to content</a><header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6"><Link className="serif text-3xl" href="/">gather<span className="text-accent">.</span></Link><nav aria-label="Main navigation" className="flex items-center gap-6 text-sm"><Link href="/dashboard">My invitations</Link><Link href="/login">Sign in</Link></nav></header><main id="main">{children}</main><footer className="mx-auto mt-16 max-w-6xl border-t border-ink/15 px-6 py-8 text-sm text-ink/70">Made for moments worth sharing.</footer></body></html>;
}
