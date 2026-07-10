'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import type {
  ArtistIndexConfidenceLevel,
  ArtistIndexCoverageStatus,
  ArtistIndexGroupType,
  ArtistIndexTrendBand,
} from '../data/v4/charts/artistIndexChartData';
import type { FandexPythonExportSourceKey } from '../data/v4/pythonExportedFandexData';

export type RankingExplorerRow = {
  artistId: string;
  artistName: string;
  ticker: string;
  groupType: ArtistIndexGroupType;
  coverageStatus: ArtistIndexCoverageStatus;
  currentFandexPoint: number;
  sixMonthDelta: number | null;
  trendBand: ArtistIndexTrendBand;
  confidenceLevel: ArtistIndexConfidenceLevel;
  lastUpdated: string;
  topMetricLabels: string[];
  metricScores: Record<string, never>;
  metricMonthLabel: string;
  sourcePoints: Record<FandexPythonExportSourceKey, number | null>;
  sourceRanks: Record<FandexPythonExportSourceKey, number | null>;
  mainSourceLabel: string;
  searchAliases: string[];
  detailHref?: string;
  compareHref?: string;
};

type GroupFilter = 'all' | 'girl_group' | 'boy_group' | 'solo' | 'unit_mixed';
type CoverageFilter = ArtistIndexCoverageStatus | 'all';
type SourceFilter = FandexPythonExportSourceKey | 'all';
type SortKey =
  | 'current_desc'
  | 'naver_desc'
  | 'youtube_desc'
  | 'music_chart_desc'
  | 'name_asc';

const groupFilterOptions: Array<{ value: GroupFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'girl_group', label: '걸그룹' },
  { value: 'boy_group', label: '보이그룹' },
  { value: 'solo', label: '솔로' },
  { value: 'unit_mixed', label: '유닛/혼성' },
];

const coverageFilterOptions: Array<{ value: CoverageFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'tracked', label: '상세 연결' },
  { value: 'partial', label: '일부 연결' },
  { value: 'preview', label: '랭킹 전용' },
];

const sourceFilterOptions: Array<{ value: SourceFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'naver', label: 'Naver 있음' },
  { value: 'youtube', label: 'YouTube 있음' },
  { value: 'musicChart', label: 'Music chart 있음' },
];

const sortOptions: Array<{ value: SortKey; label: string }> = [
  { value: 'current_desc', label: 'FANDEX 높은 순' },
  { value: 'naver_desc', label: 'Naver 높은 순' },
  { value: 'youtube_desc', label: 'YouTube 높은 순' },
  { value: 'music_chart_desc', label: 'Music chart 높은 순' },
  { value: 'name_asc', label: '이름순' },
];

const groupTypeLabels: Record<ArtistIndexGroupType, string> = {
  girl_group: '걸그룹',
  boy_group: '보이그룹',
  solo: '솔로',
  mixed: '혼성',
  unit: '유닛',
};

const coverageStatusLabels: Record<ArtistIndexCoverageStatus, string> = {
  tracked: '상세 연결',
  partial: '일부 연결',
  preview: '랭킹 전용',
};

function formatPoint(value: number) {
  return `${new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 2,
  }).format(value)}pt`;
}

function formatSourcePoint(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSourceRank(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return `#${value}`;
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

function matchesSourceFilter(row: RankingExplorerRow, filter: SourceFilter) {
  if (filter === 'all') {
    return true;
  }

  return row.sourcePoints[filter] !== null;
}

function matchesQuery(row: RankingExplorerRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    row.artistId,
    row.artistName,
    row.ticker,
    ...row.searchAliases,
  ].some((value) => value.toLowerCase().includes(normalizedQuery));
}

function getSortableSourcePoint(
  row: RankingExplorerRow,
  sourceKey: FandexPythonExportSourceKey,
) {
  return row.sourcePoints[sourceKey] ?? Number.NEGATIVE_INFINITY;
}

function sortRows(rows: RankingExplorerRow[], sortKey: SortKey) {
  return [...rows].sort((a, b) => {
    if (sortKey === 'name_asc') {
      return a.artistName.localeCompare(b.artistName, 'ko-KR');
    }

    if (sortKey === 'naver_desc') {
      return getSortableSourcePoint(b, 'naver') - getSortableSourcePoint(a, 'naver');
    }

    if (sortKey === 'youtube_desc') {
      return (
        getSortableSourcePoint(b, 'youtube') -
        getSortableSourcePoint(a, 'youtube')
      );
    }

    if (sortKey === 'music_chart_desc') {
      return (
        getSortableSourcePoint(b, 'musicChart') -
        getSortableSourcePoint(a, 'musicChart')
      );
    }

    return b.currentFandexPoint - a.currentFandexPoint;
  });
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

export default function RankingExplorer({
  activeSources,
  rows,
  scoreMode,
}: {
  activeSources: FandexPythonExportSourceKey[];
  rows: RankingExplorerRow[];
  scoreMode: string;
}) {
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState<GroupFilter>('all');
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('current_desc');

  const filteredRows = useMemo(() => {
    const nextRows = rows.filter((row) => (
      matchesQuery(row, query) &&
      matchesGroupFilter(row, groupFilter) &&
      matchesSourceFilter(row, sourceFilter) &&
      (coverageFilter === 'all' || row.coverageStatus === coverageFilter)
    ));

    return sortRows(nextRows, sortKey);
  }, [coverageFilter, groupFilter, query, rows, sortKey, sourceFilter]);

  const linkedDetailCount = rows.filter((row) => row.detailHref).length;

  return (
    <section className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Export artists" value={`${rows.length}`} />
        <StatCard label="Linked detail pages" value={`${linkedDetailCount}`} />
        <StatCard label="Active sources" value={`${activeSources.length}`} />
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr_0.9fr_1fr_1fr]">
          <label className="block">
            <span className="text-xs font-black text-slate-600">검색</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="artist, ticker, source alias"
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
            label="연결 상태"
            value={coverageFilter}
            onChange={(value) => setCoverageFilter(value as CoverageFilter)}
            options={coverageFilterOptions}
          />
          <SelectControl
            label="소스"
            value={sourceFilter}
            onChange={(value) => setSourceFilter(value as SourceFilter)}
            options={sourceFilterOptions}
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
            조건에 맞는 아티스트 {filteredRows.length}
          </p>
          <p className="text-xs font-bold leading-5 text-slate-500">
            scoreMode {scoreMode}. Browser-side FANDEX calculation is not used.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setGroupFilter('all');
              setCoverageFilter('all');
              setSourceFilter('all');
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
            <h2 className="text-2xl font-black">아티스트 랭킹</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-600">
              fandex_master_ranking_latest.json의 master ranking과 소스별 점수를
              표시합니다.
            </p>
            <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
              Source columns show sourcePoints.*.cumulativePoint. Missing source
              data is displayed as a dash.
            </p>
          </div>
          <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-800">
            Python export JSON
          </span>
        </div>

        {filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
            <p className="text-lg font-black text-slate-950">
              조건에 맞는 아티스트가 없습니다.
            </p>
            <p className="mt-2 text-sm font-bold text-slate-500">
              검색어나 필터를 조정해보세요.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[1280px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black text-slate-500">
                <tr>
                  <th className="w-20 whitespace-nowrap px-4 py-3">순위</th>
                  <th className="min-w-56 px-4 py-3">아티스트</th>
                  <th className="whitespace-nowrap px-4 py-3">구분</th>
                  <th className="px-4 py-3 text-right">FANDEX</th>
                  <th className="px-4 py-3 text-right">Naver</th>
                  <th className="px-4 py-3 text-right">YouTube</th>
                  <th className="px-4 py-3 text-right">Music chart</th>
                  <th className="whitespace-nowrap px-4 py-3">Main source</th>
                  <th className="min-w-56 px-4 py-3">Data note</th>
                  <th className="whitespace-nowrap px-4 py-3">연결 상태</th>
                  <th className="whitespace-nowrap px-4 py-3">상세</th>
                  <th className="whitespace-nowrap px-4 py-3">비교</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredRows.map((row, index) => (
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
                      <p className="font-black text-slate-950">{row.artistName}</p>
                      <p className="mt-1 font-mono text-xs text-slate-500">
                        {row.ticker} / {row.artistId}
                      </p>
                      {row.searchAliases.length > 0 && (
                        <p className="mt-1 text-xs text-slate-400">
                          {row.searchAliases.slice(0, 2).join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">{groupTypeLabels[row.groupType]}</td>
                    <td className="px-4 py-4 text-right font-mono font-black text-slate-950">
                      {formatPoint(row.currentFandexPoint)}
                    </td>
                    <SourcePointCell
                      point={row.sourcePoints.naver}
                      rank={row.sourceRanks.naver}
                    />
                    <SourcePointCell
                      point={row.sourcePoints.youtube}
                      rank={row.sourceRanks.youtube}
                    />
                    <SourcePointCell
                      point={row.sourcePoints.musicChart}
                      rank={row.sourceRanks.musicChart}
                    />
                    <td className="px-4 py-4 font-mono text-xs font-black uppercase text-slate-600">
                      {row.mainSourceLabel}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-slate-700">
                        {row.topMetricLabels.length > 0
                          ? row.topMetricLabels.join(' / ')
                          : 'Python export JSON'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.metricMonthLabel}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700">
                        {coverageStatusLabels[row.coverageStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {row.detailHref ? (
                        <Link
                          href={row.detailHref}
                          className="font-black text-cyan-700 hover:text-cyan-500"
                        >
                          상세
                        </Link>
                      ) : (
                        <span className="text-xs font-black text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {row.compareHref ? (
                        <Link
                          href={row.compareHref}
                          className="rounded-full bg-cyan-600 px-4 py-2 text-xs font-black text-white hover:bg-cyan-500"
                        >
                          비교하기
                        </Link>
                      ) : (
                        <span className="text-xs font-black text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

function SourcePointCell({
  point,
  rank,
}: {
  point: number | null;
  rank: number | null;
}) {
  const rankLabel = formatSourceRank(rank);

  return (
    <td className="px-4 py-4 text-right">
      <p className="font-mono font-black text-slate-950">
        {formatSourcePoint(point)}
      </p>
      {rankLabel && (
        <p className="mt-1 font-mono text-xs font-bold text-slate-400">
          {rankLabel}
        </p>
      )}
    </td>
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
