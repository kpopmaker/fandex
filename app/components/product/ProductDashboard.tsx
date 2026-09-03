'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type {
  ProductDashboardArtistEntry,
  ProductDashboardReadModel,
} from '../../../lib/product/contracts/productDashboard';
import { getProductDashboardArtistPresentation } from '../../../lib/product/presentation/dashboardPresentation';

function normalizeSearchText(value: string) {
  return value.normalize('NFKC').trim().toLowerCase();
}

function matchesArtist(entry: ProductDashboardArtistEntry, query: string) {
  const normalizedQuery = normalizeSearchText(query);

  return (
    normalizedQuery.length === 0 ||
    entry.display.searchTerms.some((term) =>
      normalizeSearchText(term).includes(normalizedQuery),
    )
  );
}

export default function ProductDashboard({
  model,
}: {
  model: ProductDashboardReadModel;
}) {
  const [query, setQuery] = useState('');
  const filteredEntries = useMemo(
    () => model.entries.filter((entry) => matchesArtist(entry, query)),
    [model.entries, query],
  );
  const dataBasisText =
    model.dataBasis.length > 0
      ? model.dataBasis
          .map((basis) => `${basis.sourceTimeLabel} (${basis.sourceMonth})`)
          .join(' · ')
      : '관측 없음';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-700 dark:text-cyan-300">
            FANDEX
          </p>
          <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
            K-pop 아티스트 데이터를 지표와 근거로 살펴보세요.
          </h1>
          <p className="mt-5 max-w-3xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
            아티스트를 찾아 현재 제공되는 FANDEX를 확인하고, 상세 화면에서
            지표와 합성 미리보기 변수·관련 근거를 이어서 볼 수 있습니다.
          </p>
          <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-7 text-cyan-900 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
            현재 Dashboard 값은 월별 합성 미리보기 데이터입니다. 순위는 같은
            월의 현재 FANDEX 값만 비교합니다.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <label htmlFor="product-dashboard-artist-search" className="block">
            <span className="text-lg font-black">아티스트 검색</span>
            <span className="mt-1 block text-sm font-bold text-slate-500 dark:text-slate-400">
              등록된 아티스트 이름이나 ticker로 찾을 수 있습니다.
            </span>
          </label>
          <input
            id="product-dashboard-artist-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="예: aespa, 에스파, AESPA"
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
          />
        </section>

        <section
          aria-labelledby="product-dashboard-current-fandex-heading"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                Artist overview
              </p>
              <h2
                id="product-dashboard-current-fandex-heading"
                className="mt-2 text-2xl font-black"
              >
                현재 FANDEX
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                현재 제공되는 FANDEX 값이 있는 아티스트만 수치 순위에
                포함합니다.
              </p>
            </div>
            <p className="break-words text-sm font-black text-slate-500 dark:text-slate-400">
              데이터 기준 {dataBasisText}
            </p>
          </div>

          {model.entries.length === 0 ? (
            <p className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              표시할 아티스트가 없습니다.
            </p>
          ) : filteredEntries.length === 0 ? (
            <p
              aria-live="polite"
              className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
            >
              검색 결과가 없습니다.
            </p>
          ) : (
            <div className="mt-6 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredEntries.map((entry) => (
                <ArtistEntryCard key={entry.identity.artistId} entry={entry} />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function ArtistEntryCard({ entry }: { entry: ProductDashboardArtistEntry }) {
  const presentation = getProductDashboardArtistPresentation(entry);

  return (
    <article className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-xl font-black text-slate-950 dark:text-white">
            {entry.display.artistName}
          </h3>
          <p className="mt-1 break-words text-sm font-bold text-slate-500 dark:text-slate-400">
            {entry.display.koreanName} · {entry.display.ticker}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-cyan-100 px-3 py-1 text-xs font-black text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-200">
          미리보기
        </span>
      </div>

      <div className="mt-5 rounded-2xl bg-white p-4 dark:bg-slate-900">
        <p className="text-xs font-black text-slate-500 dark:text-slate-400">
          {entry.rank === null ? '현재 FANDEX' : `현재 FANDEX #${entry.rank}`}
        </p>
        <p
          className={
            presentation.state === 'data-issue'
              ? 'mt-2 break-words text-xl font-black text-amber-700 dark:text-amber-300'
              : 'mt-2 break-words font-mono text-2xl font-black text-slate-950 dark:text-white'
          }
        >
          {presentation.valueText}
        </p>
        <p className="mt-2 break-words text-xs font-bold text-slate-500 dark:text-slate-400">
          데이터 기준 {entry.source?.sourceTimeLabel ?? '관측 없음'}
        </p>
      </div>

      <Link
        href={`/artists/${entry.identity.artistId}`}
        className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-cyan-600 px-5 py-3 text-sm font-black text-white transition hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-300"
      >
        아티스트 보기
      </Link>
    </article>
  );
}
