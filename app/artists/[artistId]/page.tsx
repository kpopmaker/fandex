import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  artistIndexChartProfiles,
  calculateSixMonthDelta,
  getAvailableStockVariables,
  getIndexTrendBand,
  getLastSixMonthHistory,
  getRecentOneYearHistory,
  getSelectedVariableSeries,
  getStrongestVariables,
  getVariableDisplayName,
  type ArtistIndexChartProfile,
  type ArtistIndexCoverageStatus,
  type ArtistIndexGroupType,
  type ArtistIndexHistoryPoint,
  type ArtistIndexTrendBand,
  type ArtistStockVariableKey,
  type ArtistStockVariableSeries,
} from '../../data/v4/charts/artistIndexChartData';
import { getArtistRecentIssueSignals } from '../../data/v4/charts/issueSignals';
import {
  getMetricDisplayLabel,
  getLatestArtistMetricBreakdown,
  type FandexVariableKey,
  type ArtistMetricBreakdownItem,
} from '../../data/v4/metrics';
import {
  getNewsIssueMetricEvidenceSummaryForArtist,
  getNewsIssueSourceArtistSummary,
  getSourceCandidateSummaryForArtist,
  getSourceCandidateVariableSummaries,
  type FandexSourceCandidateVariableSummary,
} from '../../data/v4/sources';

type PageProps = {
  params: Promise<{
    artistId: string;
  }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type LineChartPoint = {
  date: string;
  value: number;
};

type SelectedVariableDetail = {
  meaning: string;
  highMeaning: string;
  lowMeaning: string;
};

const defaultSelectedVariables: ArtistStockVariableKey[] = [
  'snsFandomPoint',
  'brandFitPoint',
  'comebackActivityPoint',
];

const lineColors = ['#0891b2', '#7c3aed', '#16a34a', '#f97316'];

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
  rising: '상승 흐름',
  stable: '안정 흐름',
  falling: '하락 흐름',
  volatile: '변동성 흐름',
  insufficient_data: '데이터 부족',
};

const trendSummaryLabels: Record<ArtistIndexTrendBand, string> = {
  rising: '상승',
  stable: '안정',
  falling: '하락',
  volatile: '변동성',
  insufficient_data: '데이터 보강 필요',
};

const issueVariableLabels: Record<ArtistStockVariableKey, string> = {
  musicAlbumPoint: '음원/음반',
  newsIssuePoint: '뉴스/이슈',
  snsFandomPoint: 'SNS/팬덤',
  brandFitPoint: '브랜드 적합도',
  comebackActivityPoint: '컴백/활동',
  growthMomentumPoint: '성장 모멘텀',
  riskAdjustmentPoint: '조정 신호',
};

const selectedVariableDetails: Record<
  ArtistStockVariableKey,
  SelectedVariableDetail
> = {
  musicAlbumPoint: {
    meaning: '음원/음반 소비와 앨범 반응을 읽는 preview 변수입니다.',
    highMeaning: '최근 발매물 소비와 앨범 반응이 강하게 유지되는 상태로 해석합니다.',
    lowMeaning: '발매 반응 또는 소비 흐름이 상대적으로 약한 상태로 해석합니다.',
  },
  newsIssuePoint: {
    meaning: '기사/이슈 노출과 공개 언급 흐름을 읽는 source seed 기반 변수입니다.',
    highMeaning: '공개 언급량과 이슈 강도가 FANDEX 관심 흐름을 밀어 올리는 상태입니다.',
    lowMeaning: '최근 기사 노출이나 이슈 강도가 제한적인 상태로 해석합니다.',
  },
  snsFandomPoint: {
    meaning: 'SNS 확산과 팬덤 반응의 밀도를 읽는 preview 변수입니다.',
    highMeaning: '팬덤 반응과 공유 흐름이 빠르게 확산되는 상태로 해석합니다.',
    lowMeaning: 'SNS 반응이 안정적이거나 확산 강도가 낮은 상태로 해석합니다.',
  },
  brandFitPoint: {
    meaning: '브랜드/캠페인 적합도와 상업적 매칭 흐름을 읽는 preview 변수입니다.',
    highMeaning: '브랜드 협업이나 캠페인 관점에서 활용도가 높은 상태로 해석합니다.',
    lowMeaning: '상업적 적합도 신호가 아직 제한적인 상태로 해석합니다.',
  },
  comebackActivityPoint: {
    meaning: '컴백/활동 모멘텀과 공식 활동 흐름을 읽는 preview 변수입니다.',
    highMeaning: '컴백, 방송, 콘텐츠 활동이 최근 흐름을 강하게 만드는 상태입니다.',
    lowMeaning: '활동 공백 또는 컴백 모멘텀이 약한 상태로 해석합니다.',
  },
  growthMomentumPoint: {
    meaning: '최근 성장 흐름과 상승 탄력을 읽는 preview 변수입니다.',
    highMeaning: '최근 지표가 이전보다 빠르게 개선되는 성장 구간으로 해석합니다.',
    lowMeaning: '성장 속도가 둔화되었거나 뚜렷한 상승 신호가 약한 상태입니다.',
  },
  riskAdjustmentPoint: {
    meaning: '과열/리스크/조정 신호를 보조적으로 읽는 preview 변수입니다.',
    highMeaning: '리스크보다 안정 신호가 우세해 조정 부담이 낮은 상태로 해석합니다.',
    lowMeaning: '과열, 변동성, 평판 리스크를 더 주의해서 봐야 하는 상태입니다.',
  },
};

const metricCategoryLabels: Record<string, string> = {
  content: '콘텐츠 반응',
  attention: '관심도',
  community: '팬덤',
  commercial: '브랜드/활동',
  activity: '활동 흐름',
  quality: '조정 신호',
};

export function generateStaticParams() {
  return artistIndexChartProfiles.map((profile) => ({
    artistId: profile.artistId,
  }));
}

function formatPoint(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(value))}pt`;
}

function formatDelta(value: number) {
  return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(
    Math.round(value),
  )}pt`;
}

function formatPercentDelta(currentValue: number, baseValue?: number) {
  if (!baseValue) {
    return '없음';
  }

  const percentDelta = ((currentValue - baseValue) / baseValue) * 100;

  if (!Number.isFinite(percentDelta)) {
    return '없음';
  }

  return `${percentDelta >= 0 ? '+' : ''}${percentDelta.toFixed(1)}%`;
}

function getDeltaToneClass(value: number) {
  if (value > 0) {
    return 'text-emerald-700 dark:text-emerald-300';
  }

  if (value < 0) {
    return 'text-rose-700 dark:text-rose-300';
  }

  return 'text-slate-600 dark:text-slate-300';
}

function formatMetricScore(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const clampedValue = Math.min(Math.max(Math.round(safeValue), 0), 100);

  return `${clampedValue}점`;
}

function formatOptionalIssueScore(value: number | null) {
  return value === null ? '없음' : String(Math.round(value));
}

function formatCountMap(counts: Record<string, number>) {
  const entries = Object.entries(counts);

  return entries.length > 0
    ? entries.map(([key, count]) => `${key} ${count}`).join(' / ')
    : '없음';
}

function formatPreviewCountMap(counts: Record<string, number>) {
  const entries = Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]));

  return entries.length > 0
    ? entries.map(([key, count]) => `${key} ${count}`).join(' / ')
    : '없음';
}

function formatPreviewScore(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPreviewDateTime(value: string | null) {
  if (!value) {
    return '없음';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value));
}

function formatWeight(value: number) {
  return `${value}%`;
}

function getMetricCategoryLabel(category: string) {
  return metricCategoryLabels[category] ?? '기타 지표';
}

function getSourceCandidateVariableLabel(variableKey: FandexVariableKey) {
  return getMetricDisplayLabel(variableKey);
}

function getLatestHistoryPoint(profile: ArtistIndexChartProfile) {
  return profile.history[profile.history.length - 1];
}

function isStockVariableKey(value: string): value is ArtistStockVariableKey {
  return getAvailableStockVariables().some(
    (variable) => variable.variableKey === value,
  );
}

function parseSelectedVariables(params: {
  [key: string]: string | string[] | undefined;
}): ArtistStockVariableKey[] {
  const rawVariables = params.variables;
  const rawValue = Array.isArray(rawVariables) ? rawVariables[0] : rawVariables;

  if (!rawValue) {
    return defaultSelectedVariables;
  }

  const selectedVariables: ArtistStockVariableKey[] = [];

  rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      if (
        isStockVariableKey(value) &&
        !selectedVariables.includes(value) &&
        selectedVariables.length < 4
      ) {
        selectedVariables.push(value);
      }
    });

  return selectedVariables.length > 0
    ? selectedVariables
    : defaultSelectedVariables;
}

function buildArtistVariableHref(
  artistId: string,
  selectedVariables: ArtistStockVariableKey[],
) {
  const params = new URLSearchParams();

  params.set('variables', selectedVariables.join(','));

  return `/artists/${artistId}?${params.toString()}`;
}

function buildArtistVariableChartHref(
  artistId: string,
  variableKey: ArtistStockVariableKey,
) {
  return `${buildArtistVariableHref(artistId, [variableKey])}#variable-chart`;
}

function toggleVariableSelection(
  currentVariables: ArtistStockVariableKey[],
  targetVariable: ArtistStockVariableKey,
) {
  if (currentVariables.includes(targetVariable)) {
    return currentVariables.length === 1
      ? currentVariables
      : currentVariables.filter((variable) => variable !== targetVariable);
  }

  if (currentVariables.length >= 4) {
    return currentVariables;
  }

  return [...currentVariables, targetVariable];
}

function getSafeArtistProfile(artistId: string) {
  return artistIndexChartProfiles.find((profile) => profile.artistId === artistId);
}

function getVariableEvidenceLabel(
  variableKey: ArtistStockVariableKey,
  newsIssueSourceCount: number,
) {
  if (variableKey === 'newsIssuePoint') {
    return newsIssueSourceCount > 0
      ? `${newsIssueSourceCount}개 source seed 연결`
      : 'source seed 없음';
  }

  if (variableKey === 'riskAdjustmentPoint') {
    return '리스크/조정 보조 지표';
  }

  return '웹 데이터 변수 연결 예정';
}

function createLinePath(
  points: LineChartPoint[],
  width: number,
  height: number,
  minValue: number,
  maxValue: number,
) {
  const paddingX = 34;
  const paddingY = 24;
  const plotWidth = width - paddingX * 2;
  const plotHeight = height - paddingY * 2;
  const range = maxValue - minValue || 1;

  return points
    .map((point, index) => {
      const x = paddingX + (index / Math.max(points.length - 1, 1)) * plotWidth;
      const y = paddingY + ((maxValue - point.value) / range) * plotHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function toFandexChartPoints(history: ArtistIndexHistoryPoint[]) {
  return history.map((point) => ({
    date: point.date,
    value: point.fandexPoint,
  }));
}

function getMinMax(series: LineChartPoint[][]) {
  const values = series.flat().map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = Math.max((max - min) * 0.12, 10);

  return {
    minValue: min - padding,
    maxValue: max + padding,
  };
}

function getComparisonHref(artistId: string) {
  const compareIds = Array.from(new Set([artistId, 'ive'])).slice(0, 2);
  return `/compare?artists=${compareIds.join(',')}`;
}

export default async function ArtistDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { artistId } = await params;
  const profile = getSafeArtistProfile(artistId);

  if (!profile) {
    notFound();
  }

  const selectedVariables = parseSelectedVariables(await searchParams);
  const sixMonthHistory = getLastSixMonthHistory(profile);
  const oneYearHistory = getRecentOneYearHistory(profile);
  const latestPoint = getLatestHistoryPoint(profile);
  const fandexChartPoints = toFandexChartPoints(oneYearHistory);
  const fandexDelta = calculateSixMonthDelta(sixMonthHistory);
  const trendBand = getIndexTrendBand(oneYearHistory);
  const selectedSeries = getSelectedVariableSeries(profile, selectedVariables);
  const allVariableSeries = getSelectedVariableSeries(
    profile,
    getAvailableStockVariables().map((variable) => variable.variableKey),
  );
  const strongestVariables = getStrongestVariables(profile, 3);
  const recentIssues = getArtistRecentIssueSignals(profile.artistId, 10);
  const metricBreakdown = getLatestArtistMetricBreakdown(profile.artistId);
  const newsIssueSourceSummary = getNewsIssueSourceArtistSummary(profile.artistId);
  const newsIssueMetricEvidenceSummary =
    getNewsIssueMetricEvidenceSummaryForArtist(profile.artistId);
  const sourceCandidateSummary =
    getSourceCandidateSummaryForArtist(profile.artistId);
  const sourceCandidateVariableSummaries = getSourceCandidateVariableSummaries()
    .filter((summary) => summary.artistId === profile.artistId)
    .sort((first, second) => second.candidateCount - first.candidateCount
      || second.averageCandidateScore - first.averageCandidateScore
      || first.variableKey.localeCompare(second.variableKey))
    .slice(0, 5);
  const sixMonthChangeRate = formatPercentDelta(
    latestPoint.fandexPoint,
    sixMonthHistory[0]?.fandexPoint,
  );
  const fandexDeltaToneClass = getDeltaToneClass(fandexDelta);
  const primaryStrongestVariable = strongestVariables[0]?.displayName ?? '없음';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="font-mono text-sm font-black text-cyan-600">
                {profile.ticker}
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
                {profile.artistName} FANDEX 포인트
              </h1>
              <p className="mt-3 text-sm font-bold text-slate-500 dark:text-slate-400">
                {groupTypeLabels[profile.groupType]} /{' '}
                {coverageStatusLabels[profile.coverageStatus]} / 마지막 업데이트{' '}
                {profile.lastUpdated}
              </p>
              <p className="mt-5 max-w-3xl rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-800">
                FANDEX 포인트는 K-pop 아티스트 활동성과 반응 지표를 해석하기
                위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가
                아닙니다.
              </p>
            </div>
            <div className="flex w-full flex-col gap-4 lg:max-w-md">
              <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/artists"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-600"
              >
                아티스트 목록
              </Link>
              <Link
                href="/charts"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-600"
              >
                지수 차트 비교
              </Link>
              <Link
                href="/methodology"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-600"
              >
                산출방식
              </Link>
              <Link
                href="/coverage"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-600"
              >
                커버리지
              </Link>
              <Link
                href={getComparisonHref(profile.artistId)}
                className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-black text-white hover:bg-cyan-400"
              >
                이 아티스트를 비교에 추가
              </Link>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                      stock summary
                    </p>
                    <p className="mt-2 font-mono text-sm font-black text-slate-500 dark:text-slate-400">
                      {profile.ticker}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300">
                    {profile.lastUpdated}
                  </span>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-black text-slate-500 dark:text-slate-400">
                    현재 FANDEX
                  </p>
                  <p className="mt-1 font-mono text-4xl font-black tracking-tight text-slate-950 dark:text-white">
                    {formatPoint(latestPoint.fandexPoint)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-sm font-black">
                    <span className={fandexDeltaToneClass}>
                      6개월 변화 {formatDelta(fandexDelta)}
                    </span>
                    <span className={fandexDeltaToneClass}>
                      {sixMonthChangeRate}
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <StockSummaryMini
                    label="흐름"
                    value={trendBandLabels[trendBand]}
                  />
                  <StockSummaryMini
                    label="주요 기여 변수"
                    value={primaryStrongestVariable}
                  />
                  <StockSummaryMini
                    label="source seed"
                    value={`${newsIssueSourceSummary.itemCount}개`}
                  />
                  <StockSummaryMini
                    label="데이터 상태"
                    value={latestPoint.dataStatus}
                  />
                  <StockSummaryMini
                    label="신뢰도"
                    value={latestPoint.confidenceLevel}
                  />
                  <StockSummaryMini
                    label="마지막 업데이트"
                    value={profile.lastUpdated}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <MetricCard label="현재 FANDEX 포인트" value={formatPoint(latestPoint.fandexPoint)} />
          <MetricCard label="최근 6개월 변화" value={formatDelta(fandexDelta)} />
          <MetricCard label="흐름 구간" value={trendBandLabels[trendBand]} />
          <MetricCard label="데이터 상태" value={latestPoint.dataStatus} />
          <MetricCard label="신뢰도" value={latestPoint.confidenceLevel} />
          <MetricCard label="커버리지 상태" value={coverageStatusLabels[profile.coverageStatus]} />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                source candidate preview
              </p>
              <h2 className="mt-2 text-2xl font-black">웹 source 후보 신호</h2>
              <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                fixture source item이 이 아티스트의 FANDEX 변수 후보 신호로
                어떻게 묶이는지 보여주는 read-only preview입니다. 외부 API,
                DB, Supabase 연결은 없고 FANDEX 점수 계산에는 아직 반영하지
                않습니다.
              </p>
            </div>
            <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-100">
              fixture 기반 preview
            </span>
          </div>

          {sourceCandidateSummary ? (
            <div className="mt-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricMini
                  label="candidateCount"
                  value={String(sourceCandidateSummary.candidateCount)}
                />
                <MetricMini
                  label="sourceItemCount"
                  value={String(sourceCandidateSummary.sourceItemCount)}
                />
                <MetricMini
                  label="평균 candidateScore"
                  value={formatPreviewScore(
                    sourceCandidateSummary.averageCandidateScore,
                  )}
                />
                <MetricMini
                  label="평균 confidenceScore"
                  value={formatPreviewScore(
                    sourceCandidateSummary.averageConfidenceScore,
                  )}
                />
                <MetricMini
                  label="top variable"
                  value={
                    sourceCandidateSummary.topVariableKey
                      ? getSourceCandidateVariableLabel(
                          sourceCandidateSummary.topVariableKey,
                        )
                      : '없음'
                  }
                />
                <MetricMini
                  label="latestPublishedAt"
                  value={formatPreviewDateTime(
                    sourceCandidateSummary.latestPublishedAt,
                  )}
                />
                <MetricMini
                  label="providerCounts"
                  value={formatPreviewCountMap(
                    sourceCandidateSummary.providerCounts,
                  )}
                />
                <MetricMini
                  label="contentTypeCounts"
                  value={formatPreviewCountMap(
                    sourceCandidateSummary.contentTypeCounts,
                  )}
                />
                <MetricMini
                  label="sentimentCounts"
                  value={formatPreviewCountMap(
                    sourceCandidateSummary.sentimentCounts,
                  )}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-7 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                <p className="font-black">{sourceCandidateSummary.summaryLabel}</p>
                <p className="mt-1">{sourceCandidateSummary.summaryNote}</p>
                <p className="mt-1">
                  외부 API/DB/Supabase 연결 없음 · fixture 기반 preview · FANDEX
                  점수 계산에는 아직 반영하지 않음
                </p>
              </div>

              <div className="mt-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-black">변수별 source candidate 요약</h3>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                    preview {sourceCandidateVariableSummaries.length}개
                  </span>
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  {sourceCandidateVariableSummaries.map((summary) => (
                    <SourceCandidateVariableSummaryCard
                      key={`${summary.artistId}-${summary.variableKey}`}
                      summary={summary}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              아직 이 아티스트에 연결된 source candidate가 없습니다. 실제 점수
              계산에는 반영되지 않는 preview 영역입니다.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                variable score board
              </p>
              <h2 className="mt-2 text-2xl font-black">아티스트 변수 점수판</h2>
              <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                K-pop 아티스트를 하나의 종목처럼 볼 수 있도록 음원/음반,
                뉴스/이슈, SNS/팬덤, 브랜드, 컴백/활동, 성장, 조정 신호를 한 화면에
                모았습니다. 현재 값은 기존 FANDEX 산출 변수의 최신 월 preview point이며,
                계산 로직은 변경하지 않았습니다.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              stock view preview
            </span>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {allVariableSeries.map((series) => {
              const active = selectedVariables.includes(series.variableKey);

              return (
                <VariableScoreBreakdownCard
                  key={series.variableKey}
                  active={active}
                  evidenceLabel={getVariableEvidenceLabel(
                    series.variableKey,
                    newsIssueSourceSummary.itemCount,
                  )}
                  href={buildArtistVariableChartHref(
                    profile.artistId,
                    series.variableKey,
                  )}
                  series={series}
                />
              );
            })}
          </div>

          <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-7 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
            이 점수판은 아티스트별 변수 흐름을 읽기 위한 read-only preview입니다.
            뉴스/이슈 변수는 현재 source seed 연결 상태를 함께 표시하며, 외부 API나
            DB를 새로 연결하지 않습니다.
          </p>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                최근 1년 흐름
              </p>
              <h2 className="mt-2 text-2xl font-black">최근 1년 FANDEX 포인트 흐름</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                2025년 7월부터 2026년 7월까지의 월별 기준으로 FANDEX 포인트가{' '}
                {trendSummaryLabels[trendBand]} 흐름을 보입니다.
              </p>
            </div>
            <SingleLineChart
              ariaLabel={`${profile.artistName} 최근 1년 FANDEX 포인트 흐름 차트`}
              color="#0891b2"
              points={fandexChartPoints}
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              요약
            </p>
            <h2 className="mt-2 text-2xl font-black">포인트 지수 요약</h2>
            <div className="mt-5 grid gap-3">
              <InfoRow label="아티스트" value={profile.artistName} />
              <InfoRow label="ticker" value={profile.ticker} />
              <InfoRow label="그룹 구분" value={groupTypeLabels[profile.groupType]} />
              <InfoRow label="마지막 업데이트" value={profile.lastUpdated} />
              <InfoRow label="최근 메모" value={latestPoint.note} />
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                metric interpretation evidence
              </p>
              <h2 className="mt-2 text-2xl font-black">
                source seed 기반 지표 해석 근거
              </h2>
              <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                이 해석 근거는 기사 기반 source seed를 지표별로 분류한 참고 정보입니다.
                현재 FANDEX 포인트 계산에는 직접 반영하지 않습니다. 외부 API나 DB와
                연결되어 있지 않습니다. 중복을 줄이기 위해 개별 기사/source item 목록은
                위의 뉴스/이슈 source seed 요약에서만 확인할 수 있습니다.
              </p>
            </div>
            <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-100">
              read-only
            </span>
          </div>

          {newsIssueMetricEvidenceSummary.metricEvidence.length > 0 ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {newsIssueMetricEvidenceSummary.metricEvidence.map((evidence) => {
                const metricItem = metricBreakdown?.items.find(
                  (item) => item.key === evidence.metricKey,
                );

                return (
                  <article
                    key={evidence.metricKey}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-950 dark:text-white">
                          {metricItem?.label ?? evidence.metricKey}
                        </p>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">
                          {evidence.interpretationLabel}
                        </p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 font-mono text-xs font-black text-cyan-700 shadow-sm dark:bg-slate-950 dark:text-cyan-300">
                        {evidence.itemCount} source seed
                      </span>
                    </div>

                    <p className="mt-4 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
                      {evidence.interpretationSummary}
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <MetricMini
                        label="평균 이슈 강도"
                        value={formatOptionalIssueScore(evidence.averageIssueScore)}
                      />
                      <MetricMini
                        label="최고 이슈 강도"
                        value={formatOptionalIssueScore(evidence.maxIssueScore)}
                      />
                      <MetricMini
                        label="최신 반영 날짜"
                        value={evidence.latestPublishedDate ?? '없음'}
                      />
                      <MetricMini
                        label="category 분포"
                        value={formatCountMap(evidence.categoryCounts)}
                      />
                      <MetricMini
                        label="sentiment 분포"
                        value={formatCountMap(evidence.sentimentCounts)}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              아직 이 지표에 연결된 source seed 해석 근거가 없습니다.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                변수별 영향
              </p>
              <h2 className="mt-2 text-2xl font-black">산출 변수 선택</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                1개부터 4개까지 선택할 수 있습니다. 선택 변수 그래프는 전체
                FANDEX 포인트 산출에 영향을 준 개별 변수의 흐름을 보여줍니다.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              선택 {selectedVariables.length}/4
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {getAvailableStockVariables().map((variable) => {
              const active = selectedVariables.includes(variable.variableKey);
              const nextVariables = toggleVariableSelection(
                selectedVariables,
                variable.variableKey,
              );
              const disabledAdd = !active && selectedVariables.length >= 4;

              return (
                <Link
                  key={variable.variableKey}
                  href={buildArtistVariableHref(profile.artistId, nextVariables)}
                  scroll={false}
                  aria-disabled={disabledAdd}
                  className={
                    active
                      ? 'rounded-full border border-cyan-400 bg-cyan-50 px-4 py-2 text-sm font-black text-cyan-800 dark:border-cyan-300/40 dark:bg-cyan-400/10 dark:text-cyan-100'
                      : disabledAdd
                        ? 'rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-black text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500'
                        : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                  }
                >
                  {active ? '✓ ' : ''}
                  {variable.displayName}
                </Link>
              );
            })}
          </div>
        </section>

        <section
          id="variable-chart"
          className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]"
        >
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                선택 변수
              </p>
              <h2 className="mt-2 text-2xl font-black">선택 변수 영향 그래프</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                전체 포인트와 동일한 값이 아니라 변수별 raw/weighted point
                흐름입니다.
              </p>
            </div>
            <MultiLineChart
              ariaLabel={`${profile.artistName} 선택 변수별 영향 그래프`}
              series={selectedSeries}
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
              변수 포인트
            </p>
            <h2 className="mt-2 text-2xl font-black">선택 변수 최신 포인트</h2>
            <div className="mt-5 grid gap-3">
              {selectedSeries.map((series, index) => (
                <VariablePointCard
                  key={series.variableKey}
                  color={lineColors[index % lineColors.length]}
                  selected
                  series={series}
                />
              ))}
            </div>
          </section>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                selected variable detail
              </p>
              <h2 className="mt-2 text-2xl font-black">선택 변수 상세 요약</h2>
              <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                선택한 변수가 현재 아티스트의 FANDEX 흐름에서 어떤 의미인지
                보여주는 read-only preview입니다. 기존 점수 계산 로직은
                변경하지 않습니다.
              </p>
            </div>
            <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-100">
              read-only preview
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {selectedSeries.map((series) => (
              <SelectedVariableDetailCard
                key={series.variableKey}
                newsIssueSourceSummary={newsIssueSourceSummary}
                series={series}
              />
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
            주요 기여 변수
          </p>
          <h2 className="mt-2 text-2xl font-black">변수별 기여도 카드</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {strongestVariables.map((summary) => (
              <article
                key={summary.variableKey}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <p className="text-sm font-black text-slate-950 dark:text-white">
                  {summary.displayName}
                </p>
                <p className="mt-3 font-mono text-2xl font-black text-cyan-700 dark:text-cyan-300">
                  {formatPoint(summary.latestPoint)}
                </p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  6개월 변화 {formatDelta(summary.sixMonthDelta)}
                </p>
                <p className="mt-3 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                  {selectedVariables.includes(summary.variableKey)
                    ? '현재 선택된 변수입니다.'
                    : '현재 선택 그래프에는 포함되지 않았습니다.'}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                metric breakdown
              </p>
              <h2 className="mt-2 text-2xl font-black">FANDEX 지표 구성</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                최신 월 기준으로 FANDEX 포인트를 구성하는 11개 반응 점수를
                보여줍니다.
              </p>
            </div>
            {metricBreakdown && (
              <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-100">
                {metricBreakdown.label} 기준
              </span>
            )}
          </div>

          {metricBreakdown ? (
            <>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {metricBreakdown.items.map((item) => (
                  <MetricBreakdownCard key={item.key} item={item} />
                ))}
              </div>
              <p className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-7 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                현재 값은 FANDEX MVP preview seed 기준입니다. 실제 자동 수집
                데이터가 붙으면 지표별 점수는 더 자주 갱신될 수 있습니다.
              </p>
            </>
          ) : (
            <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              해당 지표는 아직 준비중입니다.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                source seed insight
              </p>
              <h2 className="mt-2 text-2xl font-black">뉴스/이슈 source seed 요약</h2>
              <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                이 섹션은 기사 기반 source seed를 아티스트별로 요약한 read-only 데이터입니다.
                현재 FANDEX 포인트 계산에는 직접 반영하지 않습니다. 외부 API나 DB와 연결되어
                있지 않습니다.
              </p>
            </div>
            <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-100">
              source seed
            </span>
          </div>

          {newsIssueSourceSummary.itemCount > 0 ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  label="Source item count"
                  value={String(newsIssueSourceSummary.itemCount)}
                />
                <MetricCard
                  label="평균 이슈 강도"
                  value={formatOptionalIssueScore(
                    newsIssueSourceSummary.averageIssueScore,
                  )}
                />
                <MetricCard
                  label="최고 이슈 강도"
                  value={formatOptionalIssueScore(newsIssueSourceSummary.maxIssueScore)}
                />
                <MetricCard
                  label="최신 반영 날짜"
                  value={newsIssueSourceSummary.latestPublishedDate ?? '없음'}
                />
                <MetricCard
                  label="주요 category"
                  value={newsIssueSourceSummary.topCategory ?? '없음'}
                />
                <MetricCard
                  label="sentiment 분포"
                  value={formatCountMap(newsIssueSourceSummary.sentimentCounts)}
                />
              </div>
              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {newsIssueSourceSummary.recentItems.map((item) => (
                  <article
                    key={item.sourceId}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                  >
                    <div className="flex flex-wrap gap-2 text-xs font-black text-cyan-700 dark:text-cyan-300">
                      <span>{item.publishedDate}</span>
                      <span>{item.sourceName ?? 'source seed'}</span>
                    </div>
                    <h3 className="mt-2 font-black text-slate-950 dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
                      {item.summary}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs font-black">
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                        {item.category}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                        {item.sentiment}
                      </span>
                      <span className="rounded-full bg-cyan-100 px-3 py-1 text-cyan-800 dark:bg-cyan-400/10 dark:text-cyan-100">
                        이슈 강도 {item.issueScore ?? '없음'}
                      </span>
                    </div>
                    {item.sourceUrl ? (
                      <Link
                        href={item.sourceUrl}
                        className="mt-4 inline-flex text-sm font-black text-cyan-700 hover:text-cyan-500 dark:text-cyan-300"
                      >
                        원문 보기
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              아직 이 아티스트의 news issue source seed가 없습니다.
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                FANDEX 이슈 시그널
              </p>
              <h2 className="mt-2 text-2xl font-black">최근 이슈 10개</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                FANDEX가 차트 해석을 위해 묶어둔 미리보기 이슈입니다.
                실시간 뉴스나 공식 발표 목록은 아닙니다.
              </p>
            </div>
            <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-100">
              에디토리얼 시드 기반
            </span>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[940px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  <th className="w-20 whitespace-nowrap border-b border-slate-200 p-3">순위</th>
                  <th className="min-w-[28rem] border-b border-slate-200 p-3">이슈</th>
                  <th className="whitespace-nowrap border-b border-slate-200 p-3">카테고리</th>
                  <th className="whitespace-nowrap border-b border-slate-200 p-3">변수</th>
                  <th className="whitespace-nowrap border-b border-slate-200 p-3">기준</th>
                </tr>
              </thead>
              <tbody>
                {recentIssues.map((issue, index) => (
                  <tr key={issue.id} className="font-bold text-slate-700 dark:text-slate-300">
                    <td className="border-b border-slate-100 p-3 font-mono font-black text-cyan-700 dark:border-slate-800 dark:text-cyan-300">
                      {index + 1}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      <p className="font-black text-slate-950 dark:text-white">
                        {issue.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                        {issue.summary}
                      </p>
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {issue.category}
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        {issueVariableLabels[issue.relatedVariableKey]}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 p-3 dark:border-slate-800">
                      {issue.sourceType === 'editorial_seed'
                        ? '에디토리얼 시드'
                        : '미리보기 신호'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                데이터 안내
              </p>
              <h2 className="mt-2 text-2xl font-black">데이터 기준 안내</h2>
            </div>
            <Link
              href={`/compare?artists=${profile.artistId}`}
              className="inline-flex rounded-full bg-cyan-500 px-4 py-2 text-xs font-black text-white hover:bg-cyan-400"
            >
              이 아티스트를 비교에 추가
            </Link>
          </div>
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
              FANDEX 포인트는 금융상품/투자정보가 아닙니다.
            </li>
          </ul>
        </section>
      </section>
    </main>
  );
}

function SingleLineChart({
  ariaLabel,
  color,
  points,
}: {
  ariaLabel: string;
  color: string;
  points: LineChartPoint[];
}) {
  const width = 820;
  const height = 320;
  const { minValue, maxValue } = getMinMax([points]);
  const path = createLinePath(points, width, height, minValue, maxValue);

  return (
    <ChartFrame>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="h-80 w-full">
        <ChartGrid width={width} height={height} />
        <path d={path} fill="none" stroke={color} strokeLinecap="round" strokeWidth="5" />
        {points.map((point, index) => (
          <ChartPoint
            key={point.date}
            color={color}
            height={height}
            index={index}
            maxValue={maxValue}
            minValue={minValue}
            point={point}
            pointCount={points.length}
            width={width}
          />
        ))}
      </svg>
    </ChartFrame>
  );
}

function MultiLineChart({
  ariaLabel,
  series,
}: {
  ariaLabel: string;
  series: ArtistStockVariableSeries[];
}) {
  const width = 820;
  const height = 320;
  const { minValue, maxValue } = getMinMax(series.map((item) => item.points));

  return (
    <ChartFrame>
      <div className="mb-4 flex flex-wrap gap-2">
        {series.map((item, index) => (
          <span
            key={item.variableKey}
            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm dark:bg-slate-950 dark:text-slate-300"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: lineColors[index % lineColors.length] }}
            />
            {item.displayName}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={ariaLabel} className="h-80 w-full">
        <ChartGrid width={width} height={height} />
        {series.map((item, index) => (
          <path
            key={item.variableKey}
            d={createLinePath(item.points, width, height, minValue, maxValue)}
            fill="none"
            stroke={lineColors[index % lineColors.length]}
            strokeLinecap="round"
            strokeWidth="4"
          />
        ))}
        {series.map((item, seriesIndex) =>
          item.points.map((point, pointIndex) => (
            <ChartPoint
              key={`${item.variableKey}-${point.date}`}
              color={lineColors[seriesIndex % lineColors.length]}
              height={height}
              index={pointIndex}
              maxValue={maxValue}
              minValue={minValue}
              point={point}
              pointCount={item.points.length}
              width={width}
            />
          )),
        )}
      </svg>
    </ChartFrame>
  );
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      {children}
    </div>
  );
}

function ChartGrid({ height, width }: { height: number; width: number }) {
  return (
    <>
      {[0, 1, 2, 3].map((line) => {
        const y = 24 + line * ((height - 48) / 3);
        return (
          <line
            key={line}
            x1="34"
            x2={width - 34}
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeDasharray="5 5"
            className="text-slate-200 dark:text-slate-700"
          />
        );
      })}
    </>
  );
}

function ChartPoint({
  color,
  height,
  index,
  maxValue,
  minValue,
  point,
  pointCount,
  width,
}: {
  color: string;
  height: number;
  index: number;
  maxValue: number;
  minValue: number;
  point: LineChartPoint;
  pointCount: number;
  width: number;
}) {
  const paddingX = 34;
  const paddingY = 24;
  const x = paddingX + (index / Math.max(pointCount - 1, 1)) * (width - paddingX * 2);
  const y =
    paddingY +
    ((maxValue - point.value) / (maxValue - minValue || 1)) *
      (height - paddingY * 2);

  return (
    <g>
      <circle cx={x} cy={y} r="4.5" fill="white" stroke={color} strokeWidth="3" />
      <text
        x={x}
        y={height - 7}
        textAnchor="middle"
        className="fill-slate-500 text-[11px] font-bold dark:fill-slate-400"
      >
        {point.date}
      </text>
    </g>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words font-mono text-lg font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function SelectedVariableDetailCard({
  newsIssueSourceSummary,
  series,
}: {
  newsIssueSourceSummary: ReturnType<typeof getNewsIssueSourceArtistSummary>;
  series: ArtistStockVariableSeries;
}) {
  const detail = selectedVariableDetails[series.variableKey];
  const isNewsIssue = series.variableKey === 'newsIssuePoint';
  const evidenceStatus = isNewsIssue
    ? newsIssueSourceSummary.itemCount > 0
      ? `${newsIssueSourceSummary.itemCount}개 source seed 연결`
      : 'source seed 없음'
    : series.variableKey === 'riskAdjustmentPoint'
      ? 'preview 변수 기준 / 리스크 조정 보조 지표'
      : '웹 데이터 변수 연결 예정 / preview 변수 기준';

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">
            {series.displayName}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            {getVariableDisplayName(series.variableKey)}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 font-mono text-xs font-black text-cyan-700 shadow-sm dark:bg-slate-950 dark:text-cyan-300">
          read-only
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricMini label="최신 점수" value={formatPoint(series.latestPoint)} />
        <MetricMini
          label="최근 6개월 변화"
          value={formatDelta(series.sixMonthDelta)}
        />
      </div>

      <div className="mt-4 grid gap-3">
        <VariableDetailTextRow label="변수 의미" value={detail.meaning} />
        <VariableDetailTextRow label="점수가 높을 때" value={detail.highMeaning} />
        <VariableDetailTextRow label="점수가 낮을 때" value={detail.lowMeaning} />
        <VariableDetailTextRow label="근거 상태" value={evidenceStatus} />
      </div>

      {isNewsIssue ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <MetricMini
            label="source seed 개수"
            value={String(newsIssueSourceSummary.itemCount)}
          />
          <MetricMini
            label="평균 이슈 강도"
            value={formatOptionalIssueScore(
              newsIssueSourceSummary.averageIssueScore,
            )}
          />
          <MetricMini
            label="주요 category"
            value={newsIssueSourceSummary.topCategory ?? '없음'}
          />
          <MetricMini
            label="최신 반영 날짜"
            value={newsIssueSourceSummary.latestPublishedDate ?? '없음'}
          />
          <MetricMini
            label="sentiment 분포"
            value={formatCountMap(newsIssueSourceSummary.sentimentCounts)}
          />
        </div>
      ) : null}
    </article>
  );
}

function VariableDetailTextRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-slate-950">
      <p className="text-xs font-black text-cyan-700 dark:text-cyan-300">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
        {value}
      </p>
    </div>
  );
}

function StockSummaryMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function VariablePointCard({
  color,
  selected,
  series,
}: {
  color: string;
  selected: boolean;
  series: ArtistStockVariableSeries;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">
            {series.displayName}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {selected ? '선택 변수' : getVariableDisplayName(series.variableKey)}
          </p>
        </div>
        <span
          className="mt-1 h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <MetricMini label="최신" value={formatPoint(series.latestPoint)} />
        <MetricMini label="6개월 변화" value={formatDelta(series.sixMonthDelta)} />
      </div>
    </article>
  );
}

function VariableScoreBreakdownCard({
  active,
  evidenceLabel,
  href,
  series,
}: {
  active: boolean;
  evidenceLabel: string;
  href: string;
  series: ArtistStockVariableSeries;
}) {
  const barWidth =
    Math.min(Math.max(Math.abs(series.latestPoint) / 1200, 0.08), 1) * 100;
  const deltaClassName =
    series.sixMonthDelta >= 0
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200'
      : 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200';
  const cardClassName = active
    ? 'block rounded-2xl border border-cyan-400 bg-cyan-50 p-4 shadow-sm transition hover:border-cyan-500 dark:border-cyan-300/50 dark:bg-cyan-400/10'
    : 'block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-300 hover:bg-cyan-50/50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-cyan-300/40 dark:hover:bg-cyan-400/10';

  return (
    <Link href={href} className={cardClassName}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">
            {series.displayName}
          </p>
          <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
            {evidenceLabel}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 font-mono text-xs font-black ${deltaClassName}`}>
          {formatDelta(series.sixMonthDelta)}
        </span>
      </div>

      <p className="mt-4 font-mono text-2xl font-black text-slate-950 dark:text-white">
        {formatPoint(series.latestPoint)}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white dark:bg-slate-950">
        <div
          className="h-full rounded-full bg-cyan-500"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <p className="mt-3 text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
        {active
          ? '현재 선택 그래프에 반영됨'
          : '클릭하면 이 변수만 그래프에서 봅니다.'}
      </p>
    </Link>
  );
}

function MetricBreakdownCard({ item }: { item: ArtistMetricBreakdownItem }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">
            {item.label}
          </p>
          <p className="mt-1 text-xs font-black text-slate-500 dark:text-slate-400">
            {getMetricCategoryLabel(item.category)}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 font-mono text-xs font-black text-cyan-700 shadow-sm dark:bg-slate-950 dark:text-cyan-300">
          {formatWeight(item.defaultWeight)}
        </span>
      </div>
      <p className="mt-4 font-mono text-2xl font-black text-slate-950 dark:text-white">
        {formatMetricScore(item.score)}
      </p>
      <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">
        기본 반영 비중 {formatWeight(item.defaultWeight)}
      </p>
      <p className="mt-3 text-sm font-bold leading-6 text-slate-600 dark:text-slate-300">
        {item.description}
      </p>
    </article>
  );
}

function SourceCandidateVariableSummaryCard({
  summary,
}: {
  summary: FandexSourceCandidateVariableSummary;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-950 dark:text-white">
            {getSourceCandidateVariableLabel(summary.variableKey)}
          </p>
          <p className="mt-1 font-mono text-xs font-black text-cyan-700 dark:text-cyan-300">
            {summary.variableKey}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 font-mono text-xs font-black text-cyan-700 shadow-sm dark:bg-slate-950 dark:text-cyan-300">
          {summary.candidateCount} candidates
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricMini label="sourceItemCount" value={String(summary.sourceItemCount)} />
        <MetricMini
          label="averageCandidateScore"
          value={formatPreviewScore(summary.averageCandidateScore)}
        />
        <MetricMini
          label="averageConfidenceScore"
          value={formatPreviewScore(summary.averageConfidenceScore)}
        />
        <MetricMini
          label="maxCandidateScore"
          value={formatPreviewScore(summary.maxCandidateScore)}
        />
        <MetricMini
          label="latestPublishedAt"
          value={formatPreviewDateTime(summary.latestPublishedAt)}
        />
      </div>

      <p className="mt-4 rounded-xl bg-white p-3 text-xs font-bold leading-5 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        {summary.summaryLabel}
      </p>
    </article>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 dark:bg-slate-950">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 break-words font-mono text-sm font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}
