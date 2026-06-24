'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import LanguageToggle from './LanguageToggle';
import ThemeToggle from './ThemeToggle';

const navItems = [
  { href: '/', labelKo: '홈', labelEn: 'Home' },
  { href: '/artists', labelKo: '아티스트', labelEn: 'Artists' },
  { href: '/compare', labelKo: '비교', labelEn: 'Compare' },
  { href: '/ranking', labelKo: '랭킹', labelEn: 'Ranking' },
  { href: '/signals', labelKo: '신호', labelEn: 'Signals' },
  { href: '/methodology', labelKo: '산출 방식', labelEn: 'Method' },
  { href: '/about', labelKo: '소개', labelEn: 'About' },
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
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400 text-lg font-black text-slate-950">
            F
          </div>

          <div>
            <p className="text-xl font-black leading-none text-slate-950">
              FANDEX
            </p>
            <p className="mt-1 text-xs text-slate-500">
              <LangText en="K-pop Market Index" ko="K-pop 리서치 지표" />
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
                    ? 'rounded-full bg-cyan-500 px-5 py-2 text-sm font-black text-white shadow-sm'
                    : 'rounded-full px-5 py-2 text-sm font-bold text-slate-700 hover:bg-slate-100 hover:text-cyan-700'
                }
              >
                <LangText en={item.labelEn} ko={item.labelKo} />
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden lg:block">
            <span className="rounded-full bg-slate-100 px-5 py-2 text-xs font-black text-slate-600">
              <LangText en="Mock Market v4" ko="베타 리서치 v4" />
            </span>
          </div>
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </nav>

      <div className="flex gap-2 overflow-x-auto border-t border-slate-200 bg-white/95 px-4 py-3 lg:hidden">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                active
                  ? 'shrink-0 rounded-full bg-cyan-500 px-4 py-2 text-xs font-black text-white shadow-sm'
                  : 'shrink-0 rounded-full bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700'
              }
            >
              <LangText en={item.labelEn} ko={item.labelKo} />
            </Link>
          );
        })}
      </div>
    </header>
  );
}

function LangText({ ko, en }: { ko: string; en: string }) {
  return (
    <>
      <span className="inline [html[data-language='en']_&]:hidden">{ko}</span>
      <span className="hidden [html[data-language='en']_&]:inline">{en}</span>
    </>
  );
}
