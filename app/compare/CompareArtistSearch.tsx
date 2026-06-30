'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  ArtistIndexChartProfile,
  ArtistStockVariableKey,
} from '../data/v4/charts/artistIndexChartData';
import {
  artistMatchesSearch,
  getArtistAliases,
  groupTypeLabels,
  normalizeArtistSearchText,
} from '../data/v4/charts/artistSearchAliases';

type CompareArtistSearchProps = {
  profiles: ArtistIndexChartProfile[];
  selectedArtistIds: string[];
  selectedVariables: ArtistStockVariableKey[];
};

function formatPoint(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(value))}pt`;
}

function getLatestPoint(profile: ArtistIndexChartProfile) {
  return profile.history[profile.history.length - 1];
}

export default function CompareArtistSearch({
  profiles,
  selectedArtistIds,
  selectedVariables,
}: CompareArtistSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const selectedIdSet = useMemo(
    () => new Set(selectedArtistIds),
    [selectedArtistIds],
  );
  const selectedProfiles = selectedArtistIds
    .map((artistId) => profiles.find((profile) => profile.artistId === artistId))
    .filter((profile): profile is ArtistIndexChartProfile => Boolean(profile));
  const normalizedQuery = normalizeArtistSearchText(query);
  const results = profiles
    .filter((profile) => {
      if (!normalizedQuery) {
        return !selectedIdSet.has(profile.artistId);
      }

      return artistMatchesSearch(profile, query);
    })
    .slice(0, 10);

  function pushArtists(nextArtistIds: string[]) {
    const params = new URLSearchParams();
    params.set('artists', nextArtistIds.join(','));
    params.set('variables', selectedVariables.join(','));
    router.push(`/compare?${params.toString()}`, { scroll: false });
  }

  function addArtist(artistId: string) {
    if (selectedIdSet.has(artistId) || selectedArtistIds.length >= 5) {
      return;
    }

    pushArtists([...selectedArtistIds, artistId]);
    setQuery('');
  }

  function removeArtist(artistId: string) {
    if (selectedArtistIds.length <= 2) {
      return;
    }

    pushArtists(selectedArtistIds.filter((id) => id !== artistId));
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
            아티스트 선택
          </p>
          <h2 className="mt-2 text-2xl font-black">검색해서 비교 대상 추가</h2>
          <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
            2명부터 5명까지 비교할 수 있습니다. 이미 선택한 아티스트는 다시
            추가할 수 없습니다.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
          선택 {selectedArtistIds.length}/5
        </span>
      </div>

      <label className="mt-5 block">
        <span className="sr-only">아티스트 검색</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="아티스트 이름이나 ticker로 검색"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-cyan-500 dark:focus:ring-cyan-400/20"
        />
      </label>

      <div className="mt-5">
        <p className="text-sm font-black text-slate-700">비교 대상</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedProfiles.map((profile) => (
            <button
              key={profile.artistId}
              type="button"
              onClick={() => removeArtist(profile.artistId)}
              disabled={selectedArtistIds.length <= 2}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-black text-cyan-800 disabled:cursor-not-allowed disabled:opacity-70"
              title={
                selectedArtistIds.length <= 2
                  ? '비교 대상은 최소 2명이어야 합니다.'
                  : '비교 대상에서 제거'
              }
            >
              {profile.artistName}
              <span aria-hidden="true">x</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        <p className="text-sm font-black text-slate-700">검색 결과</p>
        {results.map((profile) => {
          const selected = selectedIdSet.has(profile.artistId);
          const disabled = selected || selectedArtistIds.length >= 5;
          const latest = getLatestPoint(profile);
          const aliases = getArtistAliases(profile.artistId);

          return (
            <article
              key={profile.artistId}
              className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto]"
            >
              <div>
                <p className="font-black text-slate-950">
                  {profile.artistName}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  {profile.ticker} / {groupTypeLabels[profile.groupType]} / 현재{' '}
                  {formatPoint(latest?.fandexPoint ?? 0)}
                </p>
                {aliases.length > 0 && (
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {aliases.slice(0, 2).join(', ')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => addArtist(profile.artistId)}
                disabled={disabled}
                className={
                  disabled
                    ? 'rounded-full bg-slate-200 px-4 py-2 text-xs font-black text-slate-500'
                    : 'rounded-full bg-cyan-600 px-4 py-2 text-xs font-black text-white hover:bg-cyan-500'
                }
              >
                {selected ? '선택됨' : selectedArtistIds.length >= 5 ? '최대 5명' : '추가'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
