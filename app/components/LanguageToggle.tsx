'use client';

import { useEffect, useSyncExternalStore } from 'react';

type Language = 'ko' | 'en';

const storageKey = 'fandex-language';

function applyLanguage(language: Language) {
  document.documentElement.dataset.language = language;
}

function getLanguageSnapshot(): Language {
  if (typeof document === 'undefined') {
    return 'ko';
  }

  return document.documentElement.dataset.language === 'en' ? 'en' : 'ko';
}

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener);
  window.addEventListener('fandex-language-change', listener);

  return () => {
    window.removeEventListener('storage', listener);
    window.removeEventListener('fandex-language-change', listener);
  };
}

export default function LanguageToggle() {
  const language = useSyncExternalStore(
    subscribe,
    getLanguageSnapshot,
    () => 'ko',
  );

  useEffect(() => {
    const storedLanguage =
      window.localStorage.getItem(storageKey) === 'en' ? 'en' : 'ko';

    applyLanguage(storedLanguage);
    window.dispatchEvent(new Event('fandex-language-change'));
  }, []);

  function toggleLanguage() {
    const nextLanguage = language === 'ko' ? 'en' : 'ko';

    window.localStorage.setItem(storageKey, nextLanguage);
    applyLanguage(nextLanguage);
    window.dispatchEvent(new Event('fandex-language-change'));
  }

  return (
    <button
      type="button"
      aria-label={language === 'ko' ? 'Switch to English' : '한국어로 전환'}
      title={language === 'ko' ? 'English' : '한국어'}
      onClick={toggleLanguage}
      className="inline-flex h-10 shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700"
    >
      <span className={language === 'ko' ? 'text-cyan-700' : 'text-slate-400'}>
        KO
      </span>
      <span className="text-slate-300">/</span>
      <span className={language === 'en' ? 'text-cyan-700' : 'text-slate-400'}>
        EN
      </span>
    </button>
  );
}
