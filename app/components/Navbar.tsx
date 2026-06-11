'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    label: 'Market',
    href: '/',
  },
  {
    label: 'Artists',
    href: '/artists',
  },
  {
    label: 'Ranking',
    href: '/ranking',
  },
  {
    label: 'Signals',
    href: '/signals',
  },
  {
    label: 'Content Lab',
    href: '/content-lab',
  },
  {
    label: 'Methodology',
    href: '/methodology',
  },
  {
    label: 'About',
    href: '/about',
  },
];

export default function Navbar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === '/') {
      return pathname === '/';
    }

    return pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#070A12]/90 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-300 text-sm font-black text-slate-950 transition group-hover:scale-105">
            F
          </div>

          <div>
            <p className="text-lg font-black tracking-tight text-white">
              FANDEX
            </p>
            <p className="hidden text-xs font-medium text-slate-500 sm:block">
              K-pop Market Index
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {navItems.map((item) => {
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                  active
                    ? 'bg-cyan-300 text-slate-950'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden rounded-full border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 lg:block">
          Mock Market v2
        </div>
      </nav>

      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-4 md:hidden">
        {navItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                active
                  ? 'bg-cyan-300 text-slate-950'
                  : 'bg-slate-900 text-slate-400'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}