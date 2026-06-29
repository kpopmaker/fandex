'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  ArtistIndexChartProfile,
  ArtistIndexGroupType,
  ArtistStockVariableKey,
} from '../data/v4/charts/artistIndexChartData';

type CompareArtistSearchProps = {
  profiles: ArtistIndexChartProfile[];
  selectedArtistIds: string[];
  selectedVariables: ArtistStockVariableKey[];
};

const groupTypeLabels: Record<ArtistIndexGroupType, string> = {
  girl_group: '걸그룹',
  boy_group: '보이그룹',
  solo: '솔로',
  mixed: '혼성',
  unit: '유닛',
};

const artistKoreanAliases: Partial<Record<string, string[]>> = {
  aespa: ['에스파'],
  ive: ['아이브'],
  riize: ['라이즈'],
  seventeen: ['세븐틴'],
  newjeans: ['뉴진스'],
  lesserafim: ['르세라핌'],
  bts: ['방탄소년단', '비티에스'],
  blackpink: ['블랙핑크'],
  twice: ['트와이스'],
  'nct-dream': ['엔시티 드림', '엔시티드림', 'NCT 드림'],
  'nct-127': ['엔시티 127', '엔시티127', 'NCT 127'],
  'stray-kids': ['스트레이 키즈', '스트레이키즈', '스키즈'],
  zerobaseone: ['제로베이스원', '제베원'],
  txt: ['투모로우바이투게더', '투바투'],
  enhypen: ['엔하이픈'],
  itzy: ['있지'],
  nmixx: ['엔믹스'],
  gidle: ['아이들', '여자아이들'],
  'kiss-of-life': ['키스오브라이프', '키오프'],
  babymonster: ['베이비몬스터'],
  illit: ['아일릿'],
  tws: ['투어스'],
  boynextdoor: ['보이넥스트도어'],
  hearts2hearts: ['하츠투하츠'],
  rescene: ['리센느'],
};

function formatPoint(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(value))}pt`;
}

function getLatestPoint(profile: ArtistIndexChartProfile) {
  return profile.history[profile.history.length - 1];
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/[\s_-]/g, '');
}

function getArtistAliases(profile: ArtistIndexChartProfile) {
  return artistKoreanAliases[profile.artistId] ?? [];
}

function getSearchTargets(profile: ArtistIndexChartProfile) {
  return [
    profile.artistName,
    profile.ticker,
    profile.artistId,
    profile.groupType,
    groupTypeLabels[profile.groupType],
    ...getArtistAliases(profile),
  ];
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
  const normalizedQuery = normalize(query);
  const results = profiles
    .filter((profile) => {
      if (!normalizedQuery) {
        return !selectedIdSet.has(profile.artistId);
      }

      return getSearchTargets(profile)
        .map(normalize)
        .some((value) => value.includes(normalizedQuery));
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
          const aliases = getArtistAliases(profile);

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
