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
import {
  getAllMetricSourceInfo,
  getMetricCoverageSummary,
  getMetricSourceSummary,
} from '../data/v4/metrics';

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
  tracked: '지속 추적',
  partial: '일부 반영',
  preview: '미리보기',
};

const trendBandLabels: Record<ArtistIndexTrendBand, string> = {
  rising: '우상향 흐름',
  stable: '안정 흐름',
  falling: '조정 흐름',
  volatile: '변동성 흐름',
  insufficient_data: '데이터 보강 필요',
};

const statusFilters: Array<{ label: string; value: ArtistIndexCoverageStatus }> = [
  { label: '지속 추적', value: 'tracked' },
  { label: '일부 반영', value: 'partial' },
  { label: '미리보기', value: 'preview' },
];

const groupFilters: Array<{ label: string; value: ArtistIndexGroupType }> = [
  { label: '걸그룹', value: 'girl_group' },
  { label: '보이그룹', value: 'boy_group' },
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
  const metricSummary = getMetricCoverageSummary();
  const metricSourceSummary = getMetricSourceSummary();
  const metricSourceInfo = getAllMetricSourceInfo();
  const monthlyPointCount = Math.round(
    metricSummary.metricPointCount / Math.max(metricSummary.monthCount, 1),
  );
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
                FANDEX 커버리지
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                현재 FANDEX 등록/추적 아티스트와 데이터 상태
              </h1>
              <p className="mt-4 max-w-3xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300 md:text-base">
                FANDEX 등록/추적 아티스트 기준으로 커버리지 상태, 그룹 구분,
                데이터 상태, 신뢰도를 확인합니다.
              </p>
              <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                {disclaimer}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-96">
              <MetricCard label="전체 아티스트" value={String(summary.totalArtistCount)} />
              <MetricCard label="지속 추적" value={String(summary.trackedArtistCount)} />
              <MetricCard label="일부 반영" value={String(summary.partialArtistCount)} />
              <MetricCard label="미리보기" value={String(summary.previewArtistCount)} />
              <MetricCard label="걸그룹" value={String(summary.girlGroupCount)} />
              <MetricCard label="보이그룹" value={String(summary.boyGroupCount)} />
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              metric coverage
            </p>
            <h2 className="mt-2 text-2xl font-black">월별 지표 기준</h2>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
              현재 FANDEX는 {metricSummary.artistCount}개 아티스트의 2025년
              7월~2026년 7월 월별 흐름을 기준으로 보여줍니다. 이번 단계의
              데이터는 실제 자동 수집 데이터가 아니라, FANDEX MVP용 preview
              seed입니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              label="반영 아티스트"
              value={`${metricSummary.artistCount}팀`}
            />
            <MetricCard
              label="월 기준"
              value={`${metricSummary.startMonth}~${metricSummary.endMonth}`}
            />
            <MetricCard
              label="월별 포인트"
              value={String(monthlyPointCount)}
            />
            <MetricCard
              label="총 metric point"
              value={String(metricSummary.metricPointCount)}
            />
            <MetricCard label="월 수" value={`${metricSummary.monthCount}개월`} />
          </div>
          <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-7 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
            이 구조를 기준으로 이후 뉴스, 검색, 유튜브, 음원 데이터를 붙일 수
            있습니다. 현재는 실제 API/DB 연동 전 단계입니다.
          </p>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              data source quality
            </p>
            <h2 className="mt-2 text-2xl font-black">데이터 출처 상태</h2>
            <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
              현재 {metricSourceSummary.totalMetrics}개 지표는 모두 FANDEX MVP preview seed 기준입니다.
              실제 데이터 연결 전, 화면 구조와 지표 흐름을 검증하기 위한 단계입니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              label="전체 지표 수"
              value={String(metricSourceSummary.totalMetrics)}
            />
            <MetricCard
              label="preview seed 기준"
              value={String(metricSourceSummary.previewSeedMetrics)}
            />
            <MetricCard
              label="planned API"
              value={String(metricSourceSummary.plannedApiMetrics)}
            />
            <MetricCard
              label="tracked"
              value={String(metricSourceSummary.trackedMetrics)}
            />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {metricSourceInfo.slice(0, 6).map((source) => (
              <article
                key={source.metricKey}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <p className="font-mono text-xs font-black text-cyan-700 dark:text-cyan-300">
                  {source.metricKey} / {source.displayLabel}
                </p>
                <p className="mt-2 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
                  {source.futureSourceHint}
                </p>
              </article>
            ))}
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
                    커버리지 상태
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
              그룹 구분
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
              신뢰도
            </p>
            <h2 className="mt-2 text-2xl font-black">신뢰도 요약</h2>
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
                필터
              </p>
              <h2 className="mt-2 text-2xl font-black">커버리지 필터</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                status와 group query param을 링크 기반으로 적용합니다.
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
              label="전체"
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
                아티스트 커버리지
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
          {filteredRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-bold leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              조건에 맞는 아티스트가 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1160px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  <th className="w-20 whitespace-nowrap border-b border-slate-200 p-3">순번</th>
                  <th className="min-w-48 border-b border-slate-200 p-3">아티스트</th>
                  <th className="whitespace-nowrap border-b border-slate-200 p-3">ticker</th>
                  <th className="whitespace-nowrap border-b border-slate-200 p-3">그룹 구분</th>
                  <th className="whitespace-nowrap border-b border-slate-200 p-3">커버리지 상태</th>
                  <th className="border-b border-slate-200 p-3">현재 FANDEX 주가</th>
                  <th className="border-b border-slate-200 p-3">6개월 변화</th>
                  <th className="whitespace-nowrap border-b border-slate-200 p-3">흐름 구간</th>
                  <th className="whitespace-nowrap border-b border-slate-200 p-3">데이터 상태</th>
                  <th className="whitespace-nowrap border-b border-slate-200 p-3">신뢰도</th>
                  <th className="whitespace-nowrap border-b border-slate-200 p-3">마지막 업데이트</th>
                  <th className="whitespace-nowrap border-b border-slate-200 p-3">이동</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, index) => (
                  <tr key={row.artistId} className="font-bold text-slate-700 dark:text-slate-300">
                    <td className="border-b border-slate-100 p-3 font-mono font-black text-cyan-700 dark:border-slate-800 dark:text-cyan-300">
                      {index + 1}
                    </td>
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
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
            데이터 안내
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
              현재 차트는 에디토리얼 시드 / 미리보기 데이터 기반이며,
              실제 공개 지표 검증과 자동 수집은 후속 단계입니다.
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
      scroll={false}
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
