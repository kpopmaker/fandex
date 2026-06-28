import Link from 'next/link';
import {
  getCoverageArtistRows,
  getCoverageConfidenceSummary,
  getCoveragePageSummary,
  getCoverageStatusGroups,
  getGroupTypeCoverageSummary,
  type ArtistIndexCoverageStatus,
  type ArtistIndexGroupType,
  type ArtistIndexTrendBand,
  type CoverageArtistRow,
} from '../data/v4/charts/artistIndexChartData';

type CoveragePageProps = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
};

const disclaimer =
  'FANDEX 주가는 K-pop 아티스트 활동성과 반응 지표를 해석하기 위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가 아닙니다.';

const groupTypeLabels: Record<ArtistIndexGroupType, string> = {
  girl_group: '걸그룹',
  boy_group: '보이그룹',
  solo: '솔로',
  mixed: '혼성',
  unit: '유닛',
};

const coverageStatusLabels: Record<ArtistIndexCoverageStatus, string> = {
  tracked: 'tracked',
  partial: 'partial',
  preview: 'preview',
};

const trendBandLabels: Record<ArtistIndexTrendBand, string> = {
  rising: '우상향 흐름',
  stable: '안정 흐름',
  falling: '조정 흐름',
  volatile: '변동성 흐름',
  insufficient_data: '데이터 보강 필요',
};

const statusFilters: Array<{ label: string; value: ArtistIndexCoverageStatus }> = [
  { label: 'Tracked', value: 'tracked' },
  { label: 'Partial', value: 'partial' },
  { label: 'Preview', value: 'preview' },
];

const groupFilters: Array<{ label: string; value: ArtistIndexGroupType }> = [
  { label: 'Girl Group', value: 'girl_group' },
  { label: 'Boy Group', value: 'boy_group' },
];

const ctaLinks = [
  { href: '/charts', label: '주가 차트' },
  { href: '/artists', label: '아티스트' },
  { href: '/compare', label: '비교' },
  { href: '/methodology', label: '산출방식' },
];

function formatPoint(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(value))}pt`;
}

function formatDelta(value: number) {
  return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(
    Math.round(value),
  )}pt`;
}

function parseCoverageStatus(value?: string | string[]) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return statusFilters.some((filter) => filter.value === rawValue)
    ? (rawValue as ArtistIndexCoverageStatus)
    : undefined;
}

function parseCoverageGroup(value?: string | string[]) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return groupFilters.some((filter) => filter.value === rawValue)
    ? (rawValue as ArtistIndexGroupType)
    : undefined;
}

function buildCoverageHref({
  group,
  status,
}: {
  group?: ArtistIndexGroupType;
  status?: ArtistIndexCoverageStatus;
}) {
  const params = new URLSearchParams();

  if (status) {
    params.set('status', status);
  }

  if (group) {
    params.set('group', group);
  }

  const query = params.toString();
  return query ? `/coverage?${query}` : '/coverage';
}

function filterCoverageRows({
  group,
  rows,
  status,
}: {
  group?: ArtistIndexGroupType;
  rows: CoverageArtistRow[];
  status?: ArtistIndexCoverageStatus;
}) {
  return rows.filter((row) => {
    const statusMatches = status ? row.coverageStatus === status : true;
    const groupMatches = group ? row.groupType === group : true;

    return statusMatches && groupMatches;
  });
}

export default async function CoveragePage({ searchParams }: CoveragePageProps) {
  const params = (await searchParams) ?? {};
  const selectedStatus = parseCoverageStatus(params.status);
  const selectedGroup = parseCoverageGroup(params.group);
  const summary = getCoveragePageSummary();
  const statusGroups = getCoverageStatusGroups();
  const groupSummary = getGroupTypeCoverageSummary();
  const confidenceSummary = getCoverageConfidenceSummary();
  const rows = getCoverageArtistRows();
  const filteredRows = filterCoverageRows({
    group: selectedGroup,
    rows,
    status: selectedStatus,
  });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#070A12] dark:text-white">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-600 dark:text-cyan-300">
                FANDEX Coverage
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                현재 FANDEX 등록/추적 아티스트와 데이터 상태
              </h1>
              <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300 md:text-base">
                FANDEX 등록/추적 아티스트 기준으로 coverageStatus, groupType,
                dataStatus, confidenceLevel을 확인합니다.
              </p>
              <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                {disclaimer}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-96">
              <MetricCard label="Total Artists" value={String(summary.totalArtistCount)} />
              <MetricCard label="Tracked" value={String(summary.trackedArtistCount)} />
              <MetricCard label="Partial" value={String(summary.partialArtistCount)} />
              <MetricCard label="Preview" value={String(summary.previewArtistCount)} />
              <MetricCard label="Girl Group" value={String(summary.girlGroupCount)} />
              <MetricCard label="Boy Group" value={String(summary.boyGroupCount)} />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          {statusGroups.map((group) => (
            <article
              key={group.status}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                    coverageStatus
                  </p>
                  <h2 className="mt-2 text-2xl font-black">{group.label}</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                  {group.count}
                </span>
              </div>
              <p className="mt-4 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                {group.description}
              </p>
            </article>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              Group Type
            </p>
            <h2 className="mt-2 text-2xl font-black">그룹 유형 요약</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {groupSummary.map((item) => (
                <MetricCard
                  key={item.groupType}
                  label={item.label}
                  value={String(item.count)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              Confidence
            </p>
            <h2 className="mt-2 text-2xl font-black">confidenceLevel 요약</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {confidenceSummary.map((item) => (
                <MetricCard
                  key={item.confidenceLevel}
                  label={item.label}
                  value={String(item.count)}
                />
              ))}
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                Filters
              </p>
              <h2 className="mt-2 text-2xl font-black">커버리지 필터</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                status와 group query를 링크 기반으로 적용합니다.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              표시 {filteredRows.length} / {summary.totalArtistCount}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <FilterLink
              active={!selectedStatus && !selectedGroup}
              href="/coverage"
              label="All"
            />
            {statusFilters.map((filter) => (
              <FilterLink
                key={filter.value}
                active={selectedStatus === filter.value}
                href={buildCoverageHref({
                  group: selectedGroup,
                  status: filter.value,
                })}
                label={filter.label}
              />
            ))}
            {groupFilters.map((filter) => (
              <FilterLink
                key={filter.value}
                active={selectedGroup === filter.value}
                href={buildCoverageHref({
                  group: filter.value,
                  status: selectedStatus,
                })}
                label={filter.label}
              />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                Artist Coverage
              </p>
              <h2 className="mt-2 text-2xl font-black">등록/추적 아티스트 목록</h2>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {ctaLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  <th className="border-b border-slate-200 p-3">artist</th>
                  <th className="border-b border-slate-200 p-3">ticker</th>
                  <th className="border-b border-slate-200 p-3">groupType</th>
                  <th className="border-b border-slate-200 p-3">coverageStatus</th>
                  <th className="border-b border-slate-200 p-3">latest FANDEX 주가</th>
                  <th className="border-b border-slate-200 p-3">6개월 변화</th>
                  <th className="border-b border-slate-200 p-3">trend band</th>
                  <th className="border-b border-slate-200 p-3">dataStatus</th>
                  <th className="border-b border-slate-200 p-3">confidenceLevel</th>
                  <th className="border-b border-slate-200 p-3">lastUpdated</th>
                  <th className="border-b border-slate-200 p-3">links</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.artistId} className="font-bold text-slate-700 dark:text-slate-300">
                    <td className="border-b border-slate-100 p-3 font-black text-slate-950 dark:border-slate-800 dark:text-white">
                      {row.artistName}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {row.ticker}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {groupTypeLabels[row.groupType]}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {coverageStatusLabels[row.coverageStatus]}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {formatPoint(row.latestFandexPoint)}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {formatDelta(row.sixMonthDelta)}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {trendBandLabels[row.trendBand]}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {row.dataStatus}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {row.confidenceLevel}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {row.lastUpdated}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/artists/${row.artistId}`}
                          className="text-cyan-700 hover:text-cyan-500 dark:text-cyan-300"
                        >
                          상세
                        </Link>
                        <Link
                          href={`/compare?artists=${row.artistId}`}
                          className="text-cyan-700 hover:text-cyan-500 dark:text-cyan-300"
                        >
                          비교
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
            Coverage / Trust Notice
          </p>
          <h2 className="mt-2 text-2xl font-black">데이터 기준 안내</h2>
          <ul className="mt-5 grid gap-3 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300 md:grid-cols-2">
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              현재 데이터는 FANDEX 등록/추적 아티스트 기준입니다.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              모든 K-pop 아티스트를 대표하지 않습니다.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              현재 차트는 editorial seed / preview 기반이며, 실제 공개 지표
              검증과 자동 수집은 후속 단계입니다.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
              FANDEX 주가는 금융상품/투자정보가 아닙니다.
            </li>
          </ul>
        </section>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words font-mono text-lg font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function FilterLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={
        active
          ? 'rounded-full border border-cyan-400 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-800 dark:border-cyan-300/40 dark:bg-cyan-400/10 dark:text-cyan-100'
          : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
      }
    >
      {label}
    </Link>
  );
}
