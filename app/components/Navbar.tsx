'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '시장' },
  { href: '/artists', label: '아티스트' },
  { href: '/compare', label: '아티스트 비교' },
  { href: '/ranking', label: '순위' },
  { href: '/signals', label: '시장 신호' },
  { href: '/methodology', label: '산정 방식' },
  { href: '/about', label: '소개' },
];

function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-lg font-black text-slate-950">
            F
          </div>

          <div>
            <p className="text-xl font-black leading-none text-white">
              FANDEX
            </p>
            <p className="mt-1 text-xs text-slate-500">
              K-pop Market Index
            </p>
          </div>
        </Link>

        <div className="hidden flex-1 items-center justify-center gap-3 lg:flex">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={
                  active
                    ? 'rounded-full bg-cyan-400 px-5 py-2 text-sm font-black text-slate-950'
                    : 'rounded-full px-5 py-2 text-sm font-bold text-slate-400 hover:bg-slate-800 hover:text-cyan-300'
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="hidden lg:block">
          <span className="rounded-full bg-slate-950 px-5 py-2 text-xs font-black text-slate-400">
            Mock Market v4
          </span>
        </div>
      </nav>

      <div className="flex gap-2 overflow-x-auto border-t border-slate-800 px-4 py-3 lg:hidden">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? 'shrink-0 rounded-full bg-cyan-400 px-4 py-2 text-xs font-black text-slate-950'
                  : 'shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400'
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
