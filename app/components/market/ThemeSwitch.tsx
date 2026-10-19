'use client';

import { useSyncExternalStore } from 'react';

type Theme = 'day' | 'night';

const STORAGE_KEY = 'fandex-theme';
const EVENT = 'fandex-theme-change';

function readTheme(): Theme {
  if (typeof document === 'undefined') return 'day';
  return document.documentElement.dataset.theme === 'night' ? 'night' : 'day';
}

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener(EVENT, listener);
  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener(EVENT, listener);
  };
}

export default function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'day' as Theme);
  const next: Theme = theme === 'day' ? 'night' : 'day';

  function toggle() {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 저장소를 쓸 수 없어도 화면 전환은 진행한다.
    }
    document.documentElement.dataset.theme = next;
    document.documentElement.classList.toggle('dark', next === 'night');
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === 'day' ? '다크 모드로 전환' : '라이트 모드로 전환'}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fx-sub transition-colors hover:bg-fx-raised hover:text-fx-ink"
    >
      {theme === 'day' ? (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.99 11.62A8.5 8.5 0 1 1 12.38 3a6.5 6.5 0 0 0 8.61 8.62Z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      )}
    </button>
  );
}
