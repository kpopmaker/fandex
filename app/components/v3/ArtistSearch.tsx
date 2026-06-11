'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { ArtistV3 } from '../../data/v3/types';

type ArtistSearchProps = {
  artists: ArtistV3[];
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

export default function ArtistSearch({ artists }: ArtistSearchProps) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    if (!normalizedQuery) {
      return [];
    }

    return artists
      .filter((artist) => {
        const searchableText = [
          artist.nameKo,
          artist.nameEn,
          artist.ticker,
          artist.agency,
          artist.fandomName ?? '',
          ...artist.members,
          ...artist.keywords,
        ]
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [artists, query]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-4">
        <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300">
          아티스트 검색
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
          관심 있는 아티스트를 바로 찾아보세요
        </h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          그룹명, 멤버명, 소속사, 티커로 검색할 수 있습니다.
        </p>
      </div>

      <div className="relative">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="예: 에스파, aespa, 카리나, SM, RIIZE"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-300"
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300"
          >
            지우기
          </button>
        )}
      </div>

      {query && (
        <div className="mt-4">
          {results.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {results.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/artists/${artist.id}`}
                  className="group rounded-2xl border border-slate-100 bg-slate-50 p-4 transition hover:border-cyan-300 hover:bg-cyan-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-cyan-300 dark:hover:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-xs font-black text-cyan-600 dark:text-cyan-300">
                        {artist.ticker}
                      </p>
                      <h3 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                        {artist.nameKo}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        {artist.nameEn} · {artist.agency}
                      </p>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm dark:bg-slate-950 dark:text-slate-400">
                      {artist.type}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {artist.shortIntro}
                  </p>

                  <p className="mt-3 text-sm font-black text-cyan-600 opacity-0 transition group-hover:opacity-100 dark:text-cyan-300">
                    상세 보기 →
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              검색 결과가 없습니다. 다른 그룹명, 멤버명, 소속사로 검색해보세요.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
