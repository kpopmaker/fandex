'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import ThemeSwitch from './ThemeSwitch';

const NAV = [
  { href: '/', label: '홈' },
  { href: '/ranking', label: '랭킹' },
  { href: '/artists', label: '아티스트' },
  { href: '/compare', label: '비교' },
  { href: '/methodology', label: '산정 방식' },
];

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/artists?q=${encodeURIComponent(trimmed)}` : '/artists');
  }

  return (
    <header className="sticky top-0 z-40 border-b border-fx-line bg-fx-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-8 px-4 lg:px-8">
        <Link href="/" className="flex shrink-0 items-baseline gap-1.5" aria-label="FANDEX 홈">
          <span className="text-[21px] font-extrabold tracking-[-0.04em] text-fx-ink">FANDEX</span>
          <span className="h-1.5 w-1.5 rounded-full bg-fx-brand" aria-hidden="true" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="주요 메뉴">
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-[15px] transition-colors ${
                  active
                    ? 'font-bold text-fx-ink'
                    : 'font-medium text-fx-sub hover:bg-fx-raised hover:text-fx-ink'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <form onSubmit={submit} role="search" className="hidden sm:block">
            <label className="flex h-10 w-64 items-center gap-2 rounded-xl bg-fx-raised px-3 text-fx-sub focus-within:ring-2 focus-within:ring-fx-brand">
              <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="sr-only">아티스트 검색</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="그룹명, 티커 검색"
                className="w-full bg-transparent text-sm text-fx-ink outline-none placeholder:text-fx-faint"
              />
            </label>
          </form>
          <ThemeSwitch />
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-fx-line px-2 py-1 md:hidden" aria-label="주요 메뉴">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm ${
                active ? 'font-bold text-fx-ink' : 'text-fx-sub'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
