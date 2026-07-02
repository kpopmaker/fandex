'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type CompareCandidate = {
  artistId: string;
  displayName: string;
  ticker?: string;
  description?: string;
  similarityLabel?: string;
  trendLabel?: string;
  currentPointLabel?: string;
  deltaLabel?: string;
  signals?: string[];
  themes?: string[];
  caution?: string;
};

type ChartsCompareSelectorProps = {
  baseArtistId: string;
  metricKey: string;
  candidates: CompareCandidate[];
  selectedCompareArtistIds: string[];
  maxCompareCount?: number;
};

function getSafeCompareIds({
  baseArtistId,
  candidateIds,
  compareArtistIds,
  maxCompareCount,
}: {
  baseArtistId: string;
  candidateIds: Set<string>;
  compareArtistIds: string[];
  maxCompareCount: number;
}) {
  const safeIds: string[] = [];

  compareArtistIds.forEach((artistId) => {
    if (
      artistId !== baseArtistId &&
      candidateIds.has(artistId) &&
      !safeIds.includes(artistId) &&
      safeIds.length < maxCompareCount
    ) {
      safeIds.push(artistId);
    }
  });

  return safeIds;
}

function buildChartsUrl({
  pathname,
  baseArtistId,
  metricKey,
  compareArtistIds,
  candidateIds,
  maxCompareCount,
}: {
  pathname: string;
  baseArtistId: string;
  metricKey: string;
  compareArtistIds: string[];
  candidateIds: Set<string>;
  maxCompareCount: number;
}) {
  const params = new URLSearchParams();
  const safeCompareIds = getSafeCompareIds({
    baseArtistId,
    candidateIds,
    compareArtistIds,
    maxCompareCount,
  });

  params.set('artist', baseArtistId);
  params.set('metric', metricKey);

  if (safeCompareIds.length > 0) {
    params.set('compare', safeCompareIds.join(','));
  }

  return `${pathname}?${params.toString()}`;
}

export default function ChartsCompareSelector({
  baseArtistId,
  metricKey,
  candidates,
  selectedCompareArtistIds,
  maxCompareCount = 4,
}: ChartsCompareSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  useSearchParams();

  const candidateIds = new Set(candidates.map((candidate) => candidate.artistId));
  const safeSelectedCompareArtistIds = getSafeCompareIds({
    baseArtistId,
    candidateIds,
    compareArtistIds: selectedCompareArtistIds,
    maxCompareCount,
  });
  const compareLimitReached =
    safeSelectedCompareArtistIds.length >= maxCompareCount;

  function replaceCompare(compareArtistIds: string[]) {
    router.replace(
      buildChartsUrl({
        pathname,
        baseArtistId,
        metricKey,
        compareArtistIds,
        candidateIds,
        maxCompareCount,
      }),
      { scroll: false },
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
        유사 흐름 카드
      </p>
      <h2 className="mt-2 text-2xl font-black">비슷한 지수 흐름</h2>
      <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
        비교할 아티스트를 선택하면 차트에 함께 표시됩니다. 선택된
        아티스트를 다시 누르면 비교에서 제외됩니다. 비교는 최대 4명까지
        추가할 수 있습니다.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {candidates.map((candidate) => {
          const isComparing = safeSelectedCompareArtistIds.includes(
            candidate.artistId,
          );
          const disabled = !isComparing && compareLimitReached;
          const nextCompareIds = isComparing
            ? safeSelectedCompareArtistIds.filter(
                (artistId) => artistId !== candidate.artistId,
              )
            : [...safeSelectedCompareArtistIds, candidate.artistId];

          return (
            <article
              key={candidate.artistId}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-950">
                    {candidate.displayName}
                  </h3>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                    유사도 {candidate.similarityLabel ?? '참고'}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                  {candidate.trendLabel}
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    현재 FANDEX 지수
                  </p>
                  <p className="mt-2 break-words text-lg font-black text-slate-950">
                    {candidate.currentPointLabel ?? '-'}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                    변화 pt
                  </p>
                  <p className="mt-2 break-words text-lg font-black text-slate-950">
                    {candidate.deltaLabel ?? '-'}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
                {candidate.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {(candidate.signals ?? []).map((signal) => (
                  <span
                    key={signal}
                    className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700"
                  >
                    {signal}
                  </span>
                ))}
              </div>
              <ul className="mt-4 grid gap-2">
                {(candidate.themes ?? []).map((theme) => (
                  <li
                    key={theme}
                    className="text-sm font-bold leading-6 text-slate-600"
                  >
                    {theme}
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold leading-6 text-slate-500">
                {candidate.caution}
              </p>
              <button
                type="button"
                disabled={disabled}
                onClick={() => replaceCompare(nextCompareIds)}
                className={
                  isComparing
                    ? 'mt-4 inline-flex rounded-full bg-slate-200 px-4 py-2 text-xs font-black text-slate-600'
                    : disabled
                      ? 'mt-4 inline-flex rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-400'
                      : 'mt-4 inline-flex rounded-full bg-cyan-500 px-4 py-2 text-xs font-black text-white hover:bg-cyan-400'
                }
              >
                {isComparing
                  ? '선택됨 · 제거'
                  : disabled
                    ? '최대 4명'
                    : '비교에 추가'}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
