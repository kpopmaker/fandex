import Link from 'next/link';
import { notFound } from 'next/navigation';
import ArtistMetricOverview from '../../components/product/ArtistMetricOverview';
import ArtistProductVariableDetail from '../../components/product/ArtistProductVariableDetail';
import {
  artistIndexChartProfiles,
  calculateSixMonthDelta,
  getLastSixMonthHistory,
  getRecentOneYearHistory,
  type ArtistIndexChartProfile,
  type ArtistIndexCoverageStatus,
  type ArtistIndexGroupType,
  type ArtistIndexHistoryPoint,
} from '../../data/v4/charts/artistIndexChartData';
import { getArtistRecentIssueSignals } from '../../data/v4/charts/issueSignals';
import { getMetricDisplayLabel } from '../../data/v4/metrics/fandexMetricDefinitions';
import { FANDEX_METRIC_END_MONTH } from '../../data/v4/metrics/fandexMetricMonths';
import type { FandexVariableKey } from '../../data/v4/metrics/fandexMetricTypes';
import {
  getNewsIssueMetricEvidenceSummaryForArtist,
  getNewsIssueSourceArtistSummary,
  getSourceCandidateSummaryForArtist,
  getSourceCandidateVariableSummaries,
  type FandexSourceCandidateVariableSummary,
} from '../../data/v4/sources';
import { getArtistProductMetricCollection } from '../../../lib/product/queries/getArtistProductMetricCollection';
import { getArtistProductVariable } from '../../../lib/product/queries/getArtistProductVariable';
import { getArtistProductVariableEvidence } from '../../../lib/product/queries/getArtistProductVariableEvidence';
import type { ProductVariableId } from '../../../lib/product/contracts/productVariable';
import { PRODUCT_VARIABLE_DEFINITIONS } from '../../../lib/product/variables/productVariableDefinitions';

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

const defaultSelectedVariables: ProductVariableId[] = [
  'snsFandomPoint',
  'brandFitPoint',
  'comebackActivityPoint',
];

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

const issueVariableLabels: Record<ProductVariableId, string> = {
  musicAlbumPoint: '음원/음반',
  newsIssuePoint: '뉴스/이슈',
  snsFandomPoint: 'SNS/팬덤',
  brandFitPoint: '브랜드 적합도',
  comebackActivityPoint: '컴백/활동',
  growthMomentumPoint: '성장 모멘텀',
  riskAdjustmentPoint: '조정 신호',
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

function getSourceCandidateVariableLabel(variableKey: FandexVariableKey) {
  return getMetricDisplayLabel(variableKey);
}

function getLatestHistoryPoint(profile: ArtistIndexChartProfile) {
  return profile.history[profile.history.length - 1];
}

function parseRequestedProductVariableIds(params: {
  [key: string]: string | string[] | undefined;
}) {
  const rawVariables = params.variables;
  const rawValue = Array.isArray(rawVariables) ? rawVariables[0] : rawVariables;

  if (!rawValue) {
    return defaultSelectedVariables;
  }

  const requestedVariables = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, values) => values.indexOf(value) === index)
    .slice(0, 4);

  return requestedVariables.length > 0
    ? requestedVariables
    : defaultSelectedVariables;
}

function getSafeArtistProfile(artistId: string) {
  return artistIndexChartProfiles.find((profile) => profile.artistId === artistId);
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

  const requestedProductVariableIds = parseRequestedProductVariableIds(
    await searchParams,
  );
  const sixMonthHistory = getLastSixMonthHistory(profile);
  const oneYearHistory = getRecentOneYearHistory(profile);
  const latestPoint = getLatestHistoryPoint(profile);
  const fandexChartPoints = toFandexChartPoints(oneYearHistory);
  const fandexDelta = calculateSixMonthDelta(sixMonthHistory);
  const productVariableResults = requestedProductVariableIds.map((variableId) =>
    getArtistProductVariable({ artistId: profile.artistId, variableId }),
  );
  const productVariableEvidenceCollections = requestedProductVariableIds.map(
    (variableId) =>
      getArtistProductVariableEvidence({
        artistId: profile.artistId,
        variableId,
      }),
  );
  const recentIssues = getArtistRecentIssueSignals(profile.artistId, 10);
  const productMetricCollection = getArtistProductMetricCollection({
    artistId: profile.artistId,
    month: FANDEX_METRIC_END_MONTH,
  });
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
  const productVariableCount = PRODUCT_VARIABLE_DEFINITIONS.length;

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
                현재 FANDEX 값과 변수·근거는 합성 데이터 기반 미리보기입니다.
                실제 관측 Production 데이터가 아니며, FANDEX 포인트는
                금융상품/투자정보가 아닙니다.
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
                    label="변수 미리보기"
                    value={`${productVariableCount}개`}
                  />
                  <StockSummaryMini
                    label="source seed"
                    value={`${newsIssueSourceSummary.itemCount}개`}
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

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="현재 FANDEX 포인트" value={formatPoint(latestPoint.fandexPoint)} />
          <MetricCard label="최근 6개월 변화" value={formatDelta(fandexDelta)} />
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

        <section className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">
                최근 1년 흐름
              </p>
              <h2 className="mt-2 text-2xl font-black">최근 1년 FANDEX 포인트 흐름</h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600 dark:text-slate-300">
                2025년 7월부터 2026년 7월까지의 source-native 월 라벨과
                FANDEX 포인트를 표시합니다.
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
              {newsIssueMetricEvidenceSummary.metricEvidence.map((evidence) => (
                <article
                  key={evidence.metricKey}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-slate-950 dark:text-white">
                          {getMetricDisplayLabel(evidence.metricKey)}
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
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm font-bold leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
              아직 이 지표에 연결된 source seed 해석 근거가 없습니다.
            </p>
          )}
        </section>

        <ArtistProductVariableDetail
          artistId={profile.artistId}
          evidenceCollections={productVariableEvidenceCollections}
          results={productVariableResults}
        />

        <ArtistMetricOverview collection={productMetricCollection} />

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
