import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Global Crypto Regulation Tracker',
  description:
    'Country-by-country register of digital-asset regulation: regulators, instruments, sourcing state, and a retunable composite index.',
};

const NAV = [
  { href: '/', label: 'Register' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/methodology', label: 'Methodology' },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-paper focus:px-3 focus:py-2 focus:font-mono focus:text-xs"
        >
          Skip to content
        </a>
        <header className="border-b-2 border-ink">
          <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="font-mono text-sm font-bold uppercase tracking-[0.2em]">
              CRT<span className="text-accent">//</span>Crypto Regulation Tracker
            </Link>
            <nav aria-label="Primary" className="flex gap-4">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="font-mono text-xs uppercase tracking-widest text-ink-2 underline-offset-4 hover:text-ink hover:underline"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-ink-3">
              Editorial dataset · 0 rows verified
            </span>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 py-6">
          {children}
        </main>
        <footer className="perf-rule mt-10">
          <div className="mx-auto max-w-6xl px-4 py-4 font-mono text-[11px] uppercase tracking-widest text-ink-3">
            Not legal advice. Scores are editorial — see{' '}
            <Link href="/methodology" className="underline underline-offset-4 hover:text-ink">
              methodology
            </Link>
            . Data edited by pull request.
          </div>
        </footer>
      </body>
    </html>
  );
}
