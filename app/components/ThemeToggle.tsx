'use client';

import { useEffect, useState } from 'react';

type Theme = 'day' | 'night';

const storageKey = 'fandex-theme';

function applyTheme(theme: Theme) {
  const root = document.documentElement;

  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'night');
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'day';
  }

  return window.localStorage.getItem(storageKey) === 'night' ? 'night' : 'day';
}

function SunIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M20.99 11.62A8.5 8.5 0 1 1 12.38 3a6.5 6.5 0 0 0 8.61 8.62Z" />
    </svg>
  );
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('day');

  useEffect(() => {
    const storedTheme = getStoredTheme();

    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === 'day' ? 'night' : 'day';

    setTheme(nextTheme);
    window.localStorage.setItem(storageKey, nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <button
      type="button"
      aria-label={theme === 'day' ? 'Switch to night mode' : 'Switch to day mode'}
      title={theme === 'day' ? 'Night mode' : 'Day mode'}
      onClick={toggleTheme}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700"
    >
      {theme === 'day' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
