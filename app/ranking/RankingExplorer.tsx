'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type {
  ArtistIndexConfidenceLevel,
  ArtistIndexCoverageStatus,
  ArtistIndexGroupType,
  ArtistIndexTrendBand,
} from '../data/v4/charts/artistIndexChartData';
import {
  artistMatchesSearch,
  getArtistAliases,
  groupTypeLabels,
} from '../data/v4/charts/artistSearchAliases';
import { FANDEX_METRIC_DEFINITIONS } from '../data/v4/metrics/fandexMetricDefinitions';
import type { FandexVariableKey } from '../data/v4/metrics/fandexMetricTypes';

export type RankingExplorerRow = {
  artistId: string;
  artistName: string;
  ticker: string;
  groupType: ArtistIndexGroupType;
  coverageStatus: ArtistIndexCoverageStatus;
  currentFandexPoint: number;
  sixMonthDelta: number;
  trendBand: ArtistIndexTrendBand;
  confidenceLevel: ArtistIndexConfidenceLevel;
  lastUpdated: string;
  topMetricLabels: string[];
  metricScores: Partial<Record<FandexVariableKey, number>>;
  metricMonthLabel: string;
};

type GroupFilter = 'all' | 'girl_group' | 'boy_group' | 'solo' | 'unit_mixed';
type CoverageFilter = ArtistIndexCoverageStatus | 'all';
type TrendFilter = 'all' | 'rising' | 'stable' | 'adjusting' | 'insufficient_data';
type MetricViewFilter = FandexVariableKey | 'all';
type SortKey =
  | 'current_desc'
  | 'delta_desc'
  | 'delta_asc'
  | 'name_asc'
  | 'confidence_desc';

const groupFilterOptions: Array<{ value: GroupFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'girl_group', label: '걸그룹' },
  { value: 'boy_group', label: '보이그룹' },
  { value: 'solo', label: '솔로' },
  { value: 'unit_mixed', label: '유닛/혼성' },
];

const coverageFilterOptions: Array<{ value: CoverageFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'tracked', label: '지속 추적' },
  { value: 'partial', label: '일부 반영' },
  { value: 'preview', label: '미리보기' },
];

const trendFilterOptions: Array<{ value: TrendFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'rising', label: '상승 흐름' },
  { value: 'stable', label: '안정 흐름' },
  { value: 'adjusting', label: '조정 흐름' },
  { value: 'insufficient_data', label: '데이터 부족' },
];

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: 'current_desc', label: '현재 FANDEX 포인트 높은 순' },
  { value: 'delta_desc', label: '최근 6개월 변화 높은 순' },
  { value: 'delta_asc', label: '최근 6개월 변화 낮은 순' },
  { value: 'name_asc', label: '이름순' },
  { value: 'confidence_desc', label: '데이터 신뢰도 높은 순' },
];

const metricViewOptions: Array<{ value: MetricViewFilter; label: string }> = [
  { value: 'all', label: '전체 지표' },
  ...FANDEX_METRIC_DEFINITIONS.map((definition) => ({
    value: definition.key,
    label: definition.label,
  })),
];

const coverageStatusLabels: Record<ArtistIndexCoverageStatus, string> = {
  tracked: '지속 추적',
  partial: '일부 반영',
  preview: '미리보기',
};

const trendBandLabels: Record<ArtistIndexTrendBand, string> = {
  rising: '상승 흐름',
  stable: '안정 흐름',
  falling: '조정 흐름',
  volatile: '조정 흐름',
  insufficient_data: '데이터 부족',
};

const confidenceScores: Record<ArtistIndexConfidenceLevel, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function formatPoint(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(value))}pt`;
}

function formatDelta(value: number) {
  return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(
    Math.round(value),
  )}pt`;
}

function formatMetricScore(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  return `${Math.round(value)}점`;
}

function matchesGroupFilter(row: RankingExplorerRow, filter: GroupFilter) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'unit_mixed') {
    return row.groupType === 'unit' || row.groupType === 'mixed';
  }

  return row.groupType === filter;
}

function matchesTrendFilter(row: RankingExplorerRow, filter: TrendFilter) {
  if (filter === 'all') {
    return true;
  }

  if (filter === 'adjusting') {
    return row.trendBand === 'falling' || row.trendBand === 'volatile';
  }

  return row.trendBand === filter;
}

function sortRows(rows: RankingExplorerRow[], sortKey: SortKey) {
  return [...rows].sort((a, b) => {
    if (sortKey === 'delta_desc') {
      return b.sixMonthDelta - a.sixMonthDelta;
    }

    if (sortKey === 'delta_asc') {
      return a.sixMonthDelta - b.sixMonthDelta;
    }

    if (sortKey === 'name_asc') {
      return a.artistName.localeCompare(b.artistName, 'ko-KR');
    }

    if (sortKey === 'confidence_desc') {
      return (
        confidenceScores[b.confidenceLevel] - confidenceScores[a.confidenceLevel] ||
        b.currentFandexPoint - a.currentFandexPoint
      );
    }

    return b.currentFandexPoint - a.currentFandexPoint;
  });
}

function getMetricScore(row: RankingExplorerRow, metricKey: FandexVariableKey) {
  const score = row.metricScores[metricKey];

  if (typeof score !== 'number' || !Number.isFinite(score)) {
    return null;
  }

  return score;
}

function sortRowsForMetricView(
  rows: RankingExplorerRow[],
  metricViewFilter: MetricViewFilter,
  sortKey: SortKey,
) {
  if (metricViewFilter === 'all') {
    return sortRows(rows, sortKey);
  }

  const fallbackOrder = new Map(
    sortRows(rows, sortKey).map((row, index) => [row.artistId, index]),
  );

  return [...rows].sort((a, b) => {
    const aScore = getMetricScore(a, metricViewFilter);
    const bScore = getMetricScore(b, metricViewFilter);

    if (aScore === null && bScore === null) {
      return (
        (fallbackOrder.get(a.artistId) ?? 0) -
        (fallbackOrder.get(b.artistId) ?? 0)
      );
    }

    if (aScore === null) {
      return 1;
    }

    if (bScore === null) {
      return -1;
    }

    if (aScore !== bScore) {
      return bScore - aScore;
    }

    return (
      (fallbackOrder.get(a.artistId) ?? 0) -
      (fallbackOrder.get(b.artistId) ?? 0)
    );
  });
}

function getCompareHref(artistId: string) {
  const params = new URLSearchParams();
  params.set('artists', artistId);
  return `/compare?${params.toString()}`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-black text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-2xl font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

export default function RankingExplorer({ rows }: { rows: RankingExplorerRow[] }) {
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>('all');
  const [trendFilter, setTrendFilter] = useState<TrendFilter>('all');
  const [metricViewFilter, setMetricViewFilter] =
    useState<MetricViewFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('current_desc');

  const filteredRows = useMemo(() => {
    const nextRows = rows.filter((row) => {
      const profileLike = {
        artistId: row.artistId,
        artistName: row.artistName,
        ticker: row.ticker,
        groupType: row.groupType,
        coverageStatus: row.coverageStatus,
        lastUpdated: row.lastUpdated,
        history: [],
      };

      return (
        artistMatchesSearch(profileLike, query) &&
        matchesGroupFilter(row, groupFilter) &&
        (coverageFilter === 'all' || row.coverageStatus === coverageFilter) &&
        matchesTrendFilter(row, trendFilter)
      );
    });

    return sortRowsForMetricView(nextRows, metricViewFilter, sortKey);
  }, [
    coverageFilter,
    groupFilter,
    metricViewFilter,
    query,
    rows,
    sortKey,
    trendFilter,
  ]);

  const trackedCount = rows.filter((row) => row.coverageStatus === 'tracked').length;
  const risingCount = rows.filter((row) => row.trendBand === 'rising').length;

  return (
    <section className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="등록/추적 아티스트" value={`${rows.length}팀`} />
        <StatCard label="지속 추적" value={`${trackedCount}팀`} />
        <StatCard label="상승 흐름" value={`${risingCount}팀`} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr_0.9fr_1fr]">
          <label className="block">
            <span className="text-xs font-black text-slate-600">검색</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="아티스트 이름, ticker, artistId 검색"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
            />
          </label>

          <SelectControl
            label="구분"
            value={groupFilter}
            onChange={(value) => setGroupFilter(value as GroupFilter)}
            options={groupFilterOptions}
          />
          <SelectControl
            label="데이터 상태"
            value={coverageFilter}
            onChange={(value) => setCoverageFilter(value as CoverageFilter)}
            options={coverageFilterOptions}
          />
          <SelectControl
            label="흐름"
            value={trendFilter}
            onChange={(value) => setTrendFilter(value as TrendFilter)}
            options={trendFilterOptions}
          />
          <SelectControl
            label="지표별 보기"
            value={metricViewFilter}
            onChange={(value) => setMetricViewFilter(value as MetricViewFilter)}
            options={metricViewOptions}
          />
          <SelectControl
            label="정렬"
            value={sortKey}
            onChange={(value) => setSortKey(value as SortKey)}
            options={sortOptions}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-600">
            조건에 맞는 아티스트 {filteredRows.length}팀
          </p>
          <p className="text-xs font-bold leading-5 text-slate-500">
            지표를 선택하면 해당 점수가 높은 순으로 정렬됩니다.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setGroupFilter('all');
              setCoverageFilter('all');
              setTrendFilter('all');
              setMetricViewFilter('all');
              setSortKey('current_desc');
            }}
            className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
          >
            초기화
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-black">아티스트 랭킹 탐색</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
              검색하거나 필터를 바꿔서 원하는 아티스트를 찾아보세요.
            </p>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
              두드러진 지표는 최신 월 기준으로 상대적으로 높게 나온 항목입니다.
              현재 값은 FANDEX MVP preview seed 기준입니다.
            </p>
          </div>
          <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-800">
            FANDEX 내부 리서치 지수
          </span>
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-lg font-black text-slate-950">
              조건에 맞는 아티스트가 없습니다.
            </p>
            <p className="mt-2 text-sm font-bold text-slate-500">
              검색어를 줄이거나 필터를 바꿔보세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[1320px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="w-20 whitespace-nowrap px-4 py-3">순위</th>
                  <th className="min-w-56 px-4 py-3">아티스트</th>
                  <th className="whitespace-nowrap px-4 py-3">구분</th>
                  <th className="px-4 py-3 text-right">현재 FANDEX 포인트</th>
                  <th className="px-4 py-3 text-right">최근 6개월 변화</th>
                  <th className="min-w-56 px-4 py-3">두드러진 지표</th>
                  {metricViewFilter !== 'all' && (
                    <th className="px-4 py-3 text-right">선택 지표 점수</th>
                  )}
                  <th className="whitespace-nowrap px-4 py-3">흐름</th>
                  <th className="whitespace-nowrap px-4 py-3">데이터 상태</th>
                  <th className="whitespace-nowrap px-4 py-3">상세</th>
                  <th className="whitespace-nowrap px-4 py-3">비교</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRows.map((row, index) => {
                  const deltaTone =
                    row.sixMonthDelta >= 0 ? 'text-red-500' : 'text-blue-500';
                  const aliases = getArtistAliases(row.artistId);
                  const selectedMetricScore =
                    metricViewFilter === 'all'
                      ? null
                      : row.metricScores[metricViewFilter];

                  return (
                    <tr
                      key={row.artistId}
                      className="font-bold text-slate-700 transition hover:bg-cyan-50/60"
                    >
                      <td className="px-4 py-4">
                        <span className="font-mono font-black text-cyan-700">
                          #{index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-black text-slate-950">
                          {row.artistName}
                        </p>
                        <p className="mt-1 font-mono text-xs text-slate-500">
                          {row.ticker} / {row.artistId}
                        </p>
                        {aliases.length > 0 && (
                          <p className="mt-1 text-xs text-slate-400">
                            {aliases.slice(0, 2).join(', ')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {groupTypeLabels[row.groupType]}
                      </td>
                      <td className="px-4 py-4 text-right font-mono font-black text-slate-950">
                        {formatPoint(row.currentFandexPoint)}
                      </td>
                      <td className={`px-4 py-4 text-right font-mono font-black ${deltaTone}`}>
                        {formatDelta(row.sixMonthDelta)}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-slate-700 dark:text-slate-200">
                          {row.topMetricLabels.length > 0
                            ? row.topMetricLabels.join(' · ')
                            : '데이터 준비중'}
                        </p>
                        {row.metricMonthLabel && (
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {row.metricMonthLabel} 기준
                          </p>
                        )}
                      </td>
                      {metricViewFilter !== 'all' && (
                        <td className="px-4 py-4 text-right font-mono font-black text-slate-950">
                          {formatMetricScore(selectedMetricScore)}
                        </td>
                      )}
                      <td className="px-4 py-4">{trendBandLabels[row.trendBand]}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {coverageStatusLabels[row.coverageStatus]}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/artists/${row.artistId}`}
                          className="font-black text-cyan-700 hover:text-cyan-500"
                        >
                          상세
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={getCompareHref(row.artistId)}
                          className="rounded-full bg-cyan-600 px-4 py-2 text-xs font-black text-white hover:bg-cyan-500"
                        >
                          비교하기
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

function SelectControl({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
