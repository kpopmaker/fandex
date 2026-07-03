import Link from 'next/link';
import {
  artistIndexChartProfiles,
  calculateIndexDelta,
  getIndexTrendBand,
  type ArtistIndexChartProfile,
  type ArtistIndexCoverageStatus,
  type ArtistIndexGroupType,
  type ArtistIndexHistoryPoint,
  type ArtistIndexTrendBand,
} from '../data/v4/charts/artistIndexChartData';
import {
  calculateDominantSignals,
  findSimilarIndexMovements,
  type ArtistIndexSimilarityBand,
  type ArtistIndexSimilarityResult,
} from '../data/v4/charts/artistIndexSimilarity';
import { getArtistMetadata } from '../data/v4/charts/artistMetadata';
import {
  FANDEX_METRIC_DEFINITIONS,
  FANDEX_METRIC_END_MONTH,
  FANDEX_METRIC_MONTH_LABELS,
  FANDEX_METRIC_START_MONTH,
  getFandexMetricDefinition,
  getArtistMetricCoverageSummary,
  getArtistMonthlyMetrics,
  getMetricCoverageSummaryByMetric,
  getLatestArtistMetricBreakdown,
  getMetricCategoryLabel,
  getMetricDisplayLabel,
  getMetricSourceInfo,
  getMetricScoreForArtist,
  getTopMetricItemsForArtist,
  type FandexVariableKey,
  type FandexMetricDefinition,
  type MetricCoverageLevel,
} from '../data/v4/metrics';
import {
  getNewsIssueChartInsight,
  type NewsIssueChartInsight,
} from '../data/v4/sources';

type ChartSearchParams = {
  artist?: string;
  metric?: string;
};

type ChartPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

type AutoCompareResult = {
  recommendedArtistIds: string[];
  basis: 'metric' | 'fandex-fallback' | 'insufficient-data';
  metricKey: string;
  reasonLabel: string;
};

const trendBandLabels: Record<ArtistIndexTrendBand, string> = {
  rising: '우상향 흐름',
  stable: '안정 흐름',
  falling: '조정 흐름',
  volatile: '변동성 흐름',
  insufficient_data: '데이터 보강 필요',
};

const similarityBandLabels: Record<ArtistIndexSimilarityBand, string> = {
  very_high: '매우 높음',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const coverageStatusLabels: Record<ArtistIndexCoverageStatus, string> = {
  tracked: '지속 추적',
  partial: '일부 반영',
  preview: '미리보기',
};

const groupTypeLabels: Record<ArtistIndexGroupType, string> = {
  girl_group: '걸그룹',
  boy_group: '보이그룹',
  solo: '솔로',
  mixed: '혼성',
  unit: '유닛',
};

const chartColors = ['#0d9488', '#7c3aed', '#2563eb', '#047857', '#be123c'];

const metricCoverageLevelLabels: Record<MetricCoverageLevel, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
  empty: '비어 있음',
};

function parseChartSearchParams(params: {
  [key: string]: string | string[] | undefined;
}): ChartSearchParams {
  const artistParam = params.artist;
  const metricParam = params.metric;

  return {
    artist: Array.isArray(artistParam) ? artistParam[0] : artistParam,
    metric: Array.isArray(metricParam) ? metricParam[0] : metricParam,
  };
}

function getDefaultProfile(profiles: ArtistIndexChartProfile[]) {
  return (
    profiles.find((profile) => profile.artistId === 'aespa') ??
    profiles.find((profile) => profile.coverageStatus === 'tracked') ??
    profiles[0]
  );
}

function getAverageDistance(
  baseSeries: Array<{ month: string; value: number }>,
  compareSeries: Array<{ month: string; value: number }>,
) {
  const compareByMonth = new Map(
    compareSeries.map((point) => [point.month, point.value]),
  );
  const distances = baseSeries
    .map((point) => {
      const compareValue = compareByMonth.get(point.month);
      return compareValue === undefined
        ? null
        : Math.abs(point.value - compareValue);
    })
    .filter((value): value is number => value !== null);

  if (distances.length < Math.min(baseSeries.length, 6)) {
    return null;
  }

  return (
    distances.reduce((total, distance) => total + distance, 0) /
    distances.length
  );
}

function getFandexTrendSeries(profile: ArtistIndexChartProfile) {
  return profile.history.map((point) => ({
    month: point.date,
    value: point.fandexPoint,
  }));
}

function getMetricTrendSeries(artistId: string, metricKey: FandexVariableKey) {
  return getArtistMonthlyMetrics(artistId)
    .map((point) => {
      const value = point.variables[metricKey];

      return value === undefined || value === null || !Number.isFinite(value)
        ? null
        : {
            month: point.label,
            value,
          };
    })
    .filter(
      (point): point is { month: string; value: number } => point !== null,
    );
}

function getSimilarArtistIdsByFandexTrend({
  baseProfile,
  profiles,
  limit = 3,
}: {
  baseProfile: ArtistIndexChartProfile;
  profiles: ArtistIndexChartProfile[];
  limit?: number;
}) {
  const baseSeries = getFandexTrendSeries(baseProfile);

  return profiles
    .filter((profile) => profile.artistId !== baseProfile.artistId)
    .map((profile) => ({
      artistId: profile.artistId,
      distance: getAverageDistance(baseSeries, getFandexTrendSeries(profile)),
    }))
    .filter(
      (result): result is { artistId: string; distance: number } =>
        result.distance !== null,
    )
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((result) => result.artistId);
}

function getSimilarArtistIdsByMetric({
  baseArtistId,
  metricKey,
  profiles,
  limit = 3,
}: {
  baseArtistId: string;
  metricKey: FandexVariableKey;
  profiles: ArtistIndexChartProfile[];
  limit?: number;
}) {
  const baseSeries = getMetricTrendSeries(baseArtistId, metricKey);

  if (baseSeries.length < 6) {
    return [];
  }

  return profiles
    .filter((profile) => profile.artistId !== baseArtistId)
    .map((profile) => ({
      artistId: profile.artistId,
      distance: getAverageDistance(
        baseSeries,
        getMetricTrendSeries(profile.artistId, metricKey),
      ),
    }))
    .filter(
      (result): result is { artistId: string; distance: number } =>
        result.distance !== null,
    )
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((result) => result.artistId);
}

function getAutoCompareResult({
  baseProfile,
  metricKey,
  metricLabel,
  profiles,
}: {
  baseProfile: ArtistIndexChartProfile;
  metricKey?: FandexVariableKey;
  metricLabel: string;
  profiles: ArtistIndexChartProfile[];
}): AutoCompareResult {
  if (!metricKey) {
    return {
      recommendedArtistIds: getSimilarArtistIdsByFandexTrend({
        baseProfile,
        profiles,
      }),
      basis: 'fandex-fallback',
      metricKey: 'fandex',
      reasonLabel: 'FANDEX 포인트 흐름 유사도',
    };
  }

  const baseMetricSeries = getMetricTrendSeries(baseProfile.artistId, metricKey);

  if (baseMetricSeries.length < 6) {
    return {
      recommendedArtistIds: [],
      basis: 'insufficient-data',
      metricKey,
      reasonLabel: `${metricLabel} 지표 데이터 부족`,
    };
  }

  const metricRecommendedIds = getSimilarArtistIdsByMetric({
    baseArtistId: baseProfile.artistId,
    metricKey,
    profiles,
  });

  return metricRecommendedIds.length > 0
    ? {
        recommendedArtistIds: metricRecommendedIds,
        basis: 'metric',
        metricKey,
        reasonLabel: `${metricLabel} 지표 흐름 유사도`,
      }
    : {
        recommendedArtistIds: [],
        basis: 'insufficient-data',
        metricKey,
        reasonLabel: `${metricLabel} 지표 비교 데이터 부족`,
      };
}

function getSelectedChartContext(
  params: ChartSearchParams,
  profiles: ArtistIndexChartProfile[],
  selectedMetricKey?: FandexVariableKey,
  selectedMetricLabel = '선택 지표',
) {
  const defaultProfile = getDefaultProfile(profiles);
  const baseProfile =
    profiles.find((profile) => profile.artistId === params.artist) ??
    defaultProfile;
  const similarResults = findSimilarIndexMovements(
    baseProfile.artistId,
    profiles,
  );
  const autoCompareResult = getAutoCompareResult({
    baseProfile,
    metricKey: selectedMetricKey,
    metricLabel: selectedMetricLabel,
    profiles,
  });
  const compareProfiles = autoCompareResult.recommendedArtistIds
    .map((id) => profiles.find((profile) => profile.artistId === id))
    .filter(Boolean) as ArtistIndexChartProfile[];

  return {
    baseProfile,
    similarResults,
    autoCompareResult,
    compareProfiles,
    chartProfiles: [baseProfile, ...compareProfiles],
  };
}

function buildChartHref({
  artistId,
  metricKey,
}: {
  artistId: string;
  metricKey?: string;
}) {
  const params = new URLSearchParams();

  params.set('artist', artistId);

  if (metricKey) {
    params.set('metric', metricKey);
  }

  return `/charts?${params.toString()}`;
}

function getSelectedMetricDefinition(metricKey?: string) {
  const normalizedMetricKey = metricKey === 'social' ? 'sns' : metricKey;

  return (
    (normalizedMetricKey
      ? getFandexMetricDefinition(normalizedMetricKey)
      : undefined) ??
    FANDEX_METRIC_DEFINITIONS[0]
  );
}

function formatMonthRange() {
  const startLabel = FANDEX_METRIC_MONTH_LABELS[0] ?? '25.07';
  const endLabel =
    FANDEX_METRIC_MONTH_LABELS[FANDEX_METRIC_MONTH_LABELS.length - 1] ??
    '26.07';

  return `${startLabel}~${endLabel} MVP 기준`;
}

function formatMetricMonth(month: string) {
  const [year, monthNumber] = month.split('-');

  return year && monthNumber
    ? `${year}년 ${Number(monthNumber)}월`
    : month;
}

function formatMetricWeight(weight: number) {
  return `${weight}%`;
}

function formatMetricScore(score: number | null) {
  return score === null ? '데이터 준비중' : `${score}점`;
}

function formatPoint(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}pt`;
}

function formatDelta(value: number) {
  return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(value)}pt`;
}

function formatPercentage(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatOptionalIssueScore(value: number | null) {
  return value === null ? 'source seed 없음' : String(Math.round(value));
}

function formatCountMap(counts: Record<string, number>) {
  const entries = Object.entries(counts);

  return entries.length === 0
    ? 'source seed 없음'
    : entries.map(([key, count]) => `${key} ${count}`).join(' / ');
}

function getLatestPoint(profile: ArtistIndexChartProfile) {
  return profile.history[profile.history.length - 1];
}

function createLinePath(
  history: ArtistIndexHistoryPoint[],
  width: number,
  height: number,
  minValue: number,
  maxValue: number,
) {
  const padding = 18;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const range = maxValue - minValue || 1;

  return history
    .map((point, index) => {
      const x = padding + (index / Math.max(history.length - 1, 1)) * plotWidth;
      const y = padding + ((maxValue - point.fandexPoint) / range) * plotHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function getRecentFlowSummary(profile: ArtistIndexChartProfile) {
  const trendBand = getIndexTrendBand(profile.history);
  const delta = calculateIndexDelta(profile.history);
  const trendCopy: Record<ArtistIndexTrendBand, string> = {
    rising: '2025년 7월부터 2026년 7월까지 지수가 완만하게 올라가는 흐름입니다.',
    stable: '2025년 7월부터 2026년 7월까지 지수가 비교적 안정적으로 유지되는 흐름입니다.',
    falling: '2025년 7월부터 2026년 7월까지 지수가 낮아지는 구간이 있어 추가 확인이 필요합니다.',
    volatile: '2025년 7월부터 2026년 7월까지 변동폭이 커져 흐름 확인이 필요합니다.',
    insufficient_data: '최근 흐름을 판단하기에는 시점 데이터가 부족합니다.',
  };

  return `${trendCopy[trendBand]} 현재 문장은 에디토리얼 시드 / 미리보기 데이터 기준이며, 최근 변화는 ${formatDelta(delta)}입니다.`;
}

function getSignalCheckpoints(signals: string[]) {
  const checkpoints = new Set<string>([
    '25.07~26.07 FANDEX 지수 흐름과 변화 pt를 함께 확인하세요.',
    '커버리지 상태와 신뢰도를 함께 확인하세요.',
  ]);

  if (signals.some((signal) => signal.includes('SNS'))) {
    checkpoints.add('SNS/팬덤 변수 흐름이 전체 FANDEX 지수와 같은 방향인지 확인하세요.');
  }

  if (signals.some((signal) => signal.includes('Brand'))) {
    checkpoints.add('브랜드 적합도 변수 흐름과 현재 FANDEX 지수 위치를 함께 확인하세요.');
  }

  if (signals.some((signal) => signal.includes('Activity'))) {
    checkpoints.add('컴백/활동 변수 흐름과 해당 기간의 흐름 구간을 함께 확인하세요.');
  }

  return Array.from(checkpoints).slice(0, 3);
}
function getCompareInterpretation({
  compareProfiles,
  similarResults,
}: {
  compareProfiles: ArtistIndexChartProfile[];
  similarResults: ArtistIndexSimilarityResult[];
}) {
  const compareIds = new Set(compareProfiles.map((profile) => profile.artistId));
  const selectedResults = similarResults.filter((result) =>
    compareIds.has(result.comparedArtistId),
  );
  const mostSimilar = selectedResults[0];
  const mostDifferent = selectedResults[selectedResults.length - 1];
  const commonSignals = Array.from(
    new Set(selectedResults.flatMap((result) => result.sharedDominantSignals)),
  ).slice(0, 4);
  const comparisonView =
    selectedResults[0]?.commonThemeCandidates[0] ??
    '기준 아티스트와 비교 대상의 공통 변수 흐름을 함께 확인하세요.';

  return {
    mostSimilar,
    mostDifferent,
    commonSignals,
    comparisonView,
  };
}

function groupProfilesByCoverage(profiles: ArtistIndexChartProfile[]) {
  return {
    tracked: profiles.filter((profile) => profile.coverageStatus === 'tracked'),
    partial: profiles.filter((profile) => profile.coverageStatus === 'partial'),
    preview: profiles.filter((profile) => profile.coverageStatus === 'preview'),
  };
}

function MiniLineChart({
  profile,
  title,
}: {
  profile: ArtistIndexChartProfile;
  title: string;
}) {
  const width = 720;
  const height = 260;
  const values = profile.history.map((point) => point.fandexPoint);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const path = createLinePath(profile.history, width, height, minValue, maxValue);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
        <span className="text-xs font-bold text-slate-500">
          {profile.history[0]?.date} -{' '}
          {profile.history[profile.history.length - 1]?.date}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${profile.artistName} FANDEX 지수 차트`}
        className="h-64 w-full"
      >
        {[0, 1, 2].map((line) => {
          const y = 22 + line * 104;
          return (
            <line
              key={line}
              x1="18"
              x2="702"
              y1={y}
              y2={y}
              stroke="var(--chart-grid)"
              strokeDasharray="5 5"
            />
          );
        })}
        <path
          d={path}
          fill="none"
          stroke="#0d9488"
          strokeLinecap="round"
          strokeWidth="5"
        />
        {profile.history.map((point, index) => {
          const x = 18 + (index / Math.max(profile.history.length - 1, 1)) * 684;
          const y =
            18 +
            ((maxValue - point.fandexPoint) / (maxValue - minValue || 1)) * 224;
          return (
            <g key={point.date}>
              <circle
                cx={x}
                cy={y}
                r="5"
                fill="white"
                stroke="#0d9488"
                strokeWidth="3"
              />
              {index === 0 || index === profile.history.length - 1 ? (
                <text
                  x={x}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-slate-500 text-[12px]"
                >
                  {point.date}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CompareLineChart({ profiles }: { profiles: ArtistIndexChartProfile[] }) {
  const width = 820;
  const height = 310;
  const normalizedProfiles = profiles.map((profile) => {
    const values = profile.history.map((point) => point.fandexPoint);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    return {
      ...profile,
      history: profile.history.map((point) => ({
        ...point,
        fandexPoint: ((point.fandexPoint - min) / range) * 100,
      })),
    };
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {profiles.map((profile, index) => (
          <div
            key={profile.artistId}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600"
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: chartColors[index % chartColors.length] }}
            />
            {profile.artistName}
          </div>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="기준 아티스트와 비교 아티스트의 FANDEX 지수 흐름 비교"
        className="h-72 w-full"
      >
        {[0, 1, 2].map((line) => {
          const y = 22 + line * 124;
          return (
            <line
              key={line}
              x1="20"
              x2="800"
              y1={y}
              y2={y}
              stroke="var(--chart-grid)"
              strokeDasharray="5 5"
            />
          );
        })}
        {normalizedProfiles.map((profile, index) => (
          <path
            key={profile.artistId}
            d={createLinePath(profile.history, width, height, 0, 100)}
            fill="none"
            stroke={chartColors[index % chartColors.length]}
            strokeLinecap="round"
            strokeWidth="4"
          />
        ))}
      </svg>
    </div>
  );
}

export default async function ArtistIndexChartsPage({
  searchParams,
}: ChartPageProps) {
  const params = parseChartSearchParams(await searchParams);
  const profiles = artistIndexChartProfiles;
  const groupedProfiles = groupProfilesByCoverage(profiles);
  const selectedMetric = getSelectedMetricDefinition(params.metric);
  const selectedMetricKey = selectedMetric.key;
  const {
    baseProfile,
    similarResults,
    autoCompareResult,
    compareProfiles,
    chartProfiles,
  } = getSelectedChartContext(
    params,
    profiles,
    selectedMetricKey,
    selectedMetric.shortLabel || selectedMetric.label,
  );
  const autoRecommendedCompareArtistIds =
    autoCompareResult.recommendedArtistIds;
  const baseLatest = getLatestPoint(baseProfile);
  const baseDominantSignals = calculateDominantSignals(baseProfile.history);
  const signalCheckpoints = getSignalCheckpoints(baseDominantSignals);
  const selectedMetricScore = getMetricScoreForArtist(
    baseProfile.artistId,
    selectedMetric.key,
  );
  const selectedArtistMetricCoverage = getArtistMetricCoverageSummary(
    baseProfile.artistId,
    selectedMetric.key,
  );
  const selectedMetricCoverageSummary = getMetricCoverageSummaryByMetric(
    selectedMetric.key,
  );
  const sourceInsight = getNewsIssueChartInsight(
    baseProfile.artistId,
    selectedMetric.key,
  );
  const latestMetricBreakdown = getLatestArtistMetricBreakdown(
    baseProfile.artistId,
  );
  const topMetricItems = getTopMetricItemsForArtist(baseProfile.artistId, 2);
  const compareInterpretation = getCompareInterpretation({
    compareProfiles,
    similarResults,
  });
  const similarityByArtistId = new Map(
    similarResults.map((result) => [result.comparedArtistId, result]),
  );
  const autoRecommendedCompareProfiles = autoRecommendedCompareArtistIds
    .map((artistId) => profiles.find((profile) => profile.artistId === artistId))
    .filter(Boolean) as ArtistIndexChartProfile[];
  const autoCompareCards = autoRecommendedCompareProfiles.map((profile) => {
    const result = similarityByArtistId.get(profile.artistId);
    const latest = getLatestPoint(profile);
    const metadata = getArtistMetadata(profile.artistId);

    return {
      artistId: profile.artistId,
      displayName: profile.artistName,
      koreanName: metadata?.koreanName,
      ticker: profile.ticker,
      description: result?.editorialSummary ?? getRecentFlowSummary(profile),
      similarityLabel: result ? similarityBandLabels[result.similarityBand] : '참고',
      trendLabel: trendBandLabels[getIndexTrendBand(profile.history)],
      currentPointLabel: latest ? formatPoint(latest.fandexPoint) : '-',
      deltaLabel: formatDelta(calculateIndexDelta(profile.history)),
      signals:
        result?.sharedDominantSignals ??
        calculateDominantSignals(profile.history).slice(0, 3),
      themes: (
        result?.commonThemeCandidates ??
        getSignalCheckpoints(calculateDominantSignals(profile.history))
      ).slice(0, 3),
      caution:
        result?.cautionNote ??
        '현재 값은 FANDEX MVP preview seed 기준입니다.',
    };
  });
  const autoCompareBasisLabel = autoCompareResult.reasonLabel;
  const autoCompareIsLimited =
    autoCompareResult.basis === 'insufficient-data';
  const monthRangeLabel = formatMonthRange();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="rounded-3xl border border-cyan-200 bg-white p-7 shadow-lg shadow-cyan-100/60">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">
            FANDEX 리서치 미리보기
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            FANDEX 지수 차트
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            FANDEX 등록/추적 아티스트 기준으로 지수 흐름을 확인하고,
            비슷한 움직임을 보이는 아티스트의 변수 흐름을 함께 확인합니다.
          </p>
          <p className="mt-4 max-w-3xl rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold leading-7 text-yellow-900">
            FANDEX 지수는 K-pop 아티스트 활동성과 반응 지표를 해석하기
            위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가
            아닙니다.
          </p>
          <Link
            href={`/compare?artists=${chartProfiles
              .map((profile) => profile.artistId)
              .join(',')}`}
            className="mt-5 inline-flex rounded-full bg-cyan-500 px-5 py-3 text-xs font-black text-white hover:bg-cyan-400"
          >
            아티스트 비교에서 25.07~26.07 흐름 보기
          </Link>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/methodology"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
            >
              산출방식 보기
            </Link>
            <Link
              href="/coverage"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
            >
              커버리지 보기
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                기준 아티스트 선택
              </p>
              <h2 className="mt-2 text-2xl font-black">
                아티스트를 바꿔 지수 흐름 확인
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                지속 추적 아티스트를 먼저 보여주고 일부 반영/미리보기
                아티스트는 별도 섹션으로 구분합니다. 비교 흐름은 선택한
                지표 기준으로 자동 추천됩니다.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
              자동 추천 {autoRecommendedCompareArtistIds.length}명
            </span>
          </div>
          <div className="mt-5 grid gap-5">
            <ArtistSelectorGroup
              activeArtistId={baseProfile.artistId}
              activeMetricKey={selectedMetric.key}
              title="지속 추적 아티스트"
              profiles={groupedProfiles.tracked}
            />
            <ArtistSelectorGroup
              activeArtistId={baseProfile.artistId}
              activeMetricKey={selectedMetric.key}
              title="일부 반영 아티스트"
              profiles={groupedProfiles.partial}
              compact
            />
            <ArtistSelectorGroup
              activeArtistId={baseProfile.artistId}
              activeMetricKey={selectedMetric.key}
              title="미리보기 아티스트"
              profiles={groupedProfiles.preview}
              compact
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              기준 아티스트 요약
            </p>
            <h2 className="mt-2 text-3xl font-black">{baseProfile.artistName}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {baseProfile.ticker} / {groupTypeLabels[baseProfile.groupType]} /{' '}
              {coverageStatusLabels[baseProfile.coverageStatus]}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard label="현재 FANDEX 포인트" value={formatPoint(baseLatest.fandexPoint)} />
              <MetricCard label="최근 변화" value={formatDelta(calculateIndexDelta(baseProfile.history))} />
              <MetricCard label="흐름 구간" value={trendBandLabels[getIndexTrendBand(baseProfile.history)]} />
              <MetricCard label="마지막 업데이트" value={baseProfile.lastUpdated} />
              <MetricCard label="데이터 상태" value={baseLatest.dataStatus} />
              <MetricCard label="신뢰도" value={baseLatest.confidenceLevel} />
            </div>
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                최근 흐름 요약
              </p>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                {getRecentFlowSummary(baseProfile)}
              </p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoList title="강한 변수 흐름" items={baseDominantSignals.slice(0, 3)} />
              <InfoList title="지표 확인 포인트" items={signalCheckpoints} />
            </div>
          </article>
          <MiniLineChart profile={baseProfile} title="25.07~26.07 월별 지수 차트" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                차트 지표 기준
              </p>
              <h2 className="mt-2 text-2xl font-black">선택 지표 설명</h2>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-600">
                선택한 지표가 어떤 반응을 보는지 설명합니다. 현재 값은
                FANDEX MVP preview seed 기준입니다. 선택한 지표는 아래
                자동 비교 흐름의 추천 기준으로도 사용됩니다.
              </p>
            </div>
            <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700">
              {monthRangeLabel}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {FANDEX_METRIC_DEFINITIONS.map((definition) => {
              const active = definition.key === selectedMetric.key;

              return (
                <Link
                  key={definition.key}
                  href={buildChartHref({
                    artistId: baseProfile.artistId,
                    metricKey: definition.key,
                  })}
                  scroll={false}
                  className={
                    active
                      ? 'rounded-full bg-cyan-500 px-4 py-2 text-xs font-black text-white'
                      : 'rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700'
                  }
                >
                  {definition.shortLabel || definition.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <MetricContextPanel
              definition={selectedMetric}
              monthRangeLabel={monthRangeLabel}
            />
            <SelectedArtistMetricSummary
              artistName={baseProfile.artistName}
              metricDefinition={selectedMetric}
              metricScore={selectedMetricScore}
              latestMetricBreakdown={latestMetricBreakdown}
              topMetricItems={topMetricItems}
            />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MetricCard
              label="선택 지표 데이터"
              value={`${selectedArtistMetricCoverage.totalMonths}개월 중 ${selectedArtistMetricCoverage.availableMonths}개월 사용 가능`}
            />
            <MetricCard
              label="0점 데이터"
              value={`${selectedArtistMetricCoverage.zeroMonths}개월 / 유효한 지표 값`}
            />
            <MetricCard
              label="전체 커버리지"
              value={`${formatPercentage(
                selectedMetricCoverageSummary.coverageRate,
              )} / ${
                metricCoverageLevelLabels[
                  selectedMetricCoverageSummary.coverageLevel
                ]
              }`}
            />
          </div>
          <p className="mt-4 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-7 text-cyan-800">
            선택한 지표는 아래 자동 비교 흐름의 추천 기준으로도 사용됩니다. 0점은 유효한 지표 값으로 계산하며,
            선택 지표 데이터가 부족하면 자동 비교 흐름이 제한될 수 있습니다.
          </p>
          <ChartSourceInsightPanel
            artistName={baseProfile.artistName}
            insight={sourceInsight}
            metricLabel={selectedMetric.label}
          />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              자동 비교 흐름
            </p>
            <h2 className="mt-2 text-2xl font-black">월별 지수 흐름 비교</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
              기준 아티스트와 선택 지표를 바탕으로 월별 지수 흐름이 가까운
              아티스트를 자동으로 함께 표시합니다. 순위가 아니라 흐름의
              유사성과 공통 신호를 확인하기 위한 차트입니다.
            </p>
            {autoCompareIsLimited ? (
              <p className="mt-3 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold leading-7 text-yellow-900">
                선택 지표 데이터가 부족해 자동 비교가 제한됩니다.
              </p>
            ) : null}
          </div>
          <CompareLineChart profiles={chartProfiles} />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {chartProfiles.map((profile) => {
              const latest = getLatestPoint(profile);
              return (
                <MetricCard
                  key={profile.artistId}
                  label={`${profile.artistName} / ${
                    trendBandLabels[getIndexTrendBand(profile.history)]
                  }`}
                  value={`${formatPoint(latest.fandexPoint)} (${formatDelta(
                    calculateIndexDelta(profile.history),
                  )})`}
                />
              );
            })}
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600">
              비교 해석
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <MetricCard
                label="가장 유사한 흐름"
                value={compareInterpretation.mostSimilar?.comparedArtistName ?? '비교 대상 없음'}
              />
              <MetricCard
                label="가장 다른 흐름"
                value={compareInterpretation.mostDifferent?.comparedArtistName ?? '비교 대상 없음'}
              />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {compareInterpretation.commonSignals.map((signal) => (
                <span
                  key={signal}
                  className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700"
                >
                  {signal}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
              변수 흐름 해석 기준: {compareInterpretation.comparisonView}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                자동 비교 흐름
              </p>
              <h2 className="mt-2 text-2xl font-black">선택 지표 기반 자동 추천</h2>
              <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600">
                기준 아티스트와 선택 지표를 바탕으로 월별 지수 흐름이 가까운
                아티스트를 자동으로 함께 표시합니다. 직접 비교 대상을 고르려면
                비교 페이지에서 선택하세요.
              </p>
            </div>
            <Link
              href={`/compare?artists=${chartProfiles
                .map((profile) => profile.artistId)
                .join(',')}`}
              className="inline-flex rounded-full bg-cyan-500 px-5 py-3 text-xs font-black text-white hover:bg-cyan-400"
            >
              직접 비교하기
            </Link>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MetricCard label="현재 추천 기준" value={autoCompareBasisLabel} />
            <MetricCard
              label="표시 대상"
              value={`기준 아티스트 + 자동 추천 ${autoRecommendedCompareArtistIds.length}명`}
            />
            <MetricCard label="직접 선택" value="/compare 페이지에서 진행" />
          </div>
          {autoCompareIsLimited ? (
            <p className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold leading-7 text-yellow-900">
              선택 지표 데이터가 부족해 자동 비교가 제한됩니다.
            </p>
          ) : null}
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {autoCompareCards.length > 0 ? (
              autoCompareCards.map((candidate) => (
              <article
                key={candidate.artistId}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-slate-950">
                      {candidate.displayName}
                    </h3>
                    <p className="mt-1 font-mono text-xs font-black text-cyan-700">
                      {candidate.ticker}
                    </p>
                    {candidate.koreanName ? (
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {candidate.koreanName}
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                    선택 지표 흐름 유사
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MetricCard
                    label="현재 FANDEX 포인트"
                    value={candidate.currentPointLabel ?? '-'}
                  />
                  <MetricCard label="변화 pt" value={candidate.deltaLabel ?? '-'} />
                </div>
                <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
                  월별 지표 흐름이 가까운 후보입니다. FANDEX 포인트 흐름
                  참고선으로 함께 확인하세요.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(candidate.signals ?? []).slice(0, 3).map((signal) => (
                    <span
                      key={signal}
                      className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700"
                    >
                      {signal}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/artists/${candidate.artistId}`}
                  className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-sm hover:text-cyan-700"
                >
                  아티스트 상세 보기
                </Link>
              </article>
              ))
            ) : (
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-xl font-black text-slate-950">
                  자동 추천 제한
                </h3>
                <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
                  현재 선택 지표의 월별 데이터가 부족해 기준 아티스트 중심으로
                  표시합니다.
                </p>
              </article>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            지수 해석 메모
          </p>
          <h2 className="mt-2 text-2xl font-black">지수 해석 메모</h2>
          <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600">
            선택한 아티스트의 25.07~26.07 FANDEX 지수 흐름, 변화 pt, 흐름 구간을 함께 보며
            같은 기간 안에서 어떤 변수 흐름이 두드러지는지 확인합니다.
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {chartProfiles.map((profile) => {
              const latest = getLatestPoint(profile);
              const sixMonthDelta = calculateIndexDelta(profile.history);
              const trendBand = getIndexTrendBand(profile.history);

              return (
                <article
                  key={profile.artistId}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <p className="font-mono text-xs font-black text-cyan-700">
                    {profile.ticker}
                  </p>
                  <h3 className="mt-2 text-xl font-black text-slate-950">
                    {profile.artistName}
                  </h3>
                  <div className="mt-4 grid gap-3">
                    <MetricCard
                      label="현재 FANDEX 지수"
                      value={formatPoint(latest.fandexPoint)}
                    />
                    <MetricCard
                      label="6개월 변화"
                      value={formatDelta(sixMonthDelta)}
                    />
                    <MetricCard
                      label="흐름 구간"
                      value={trendBandLabels[trendBand]}
                    />
                  </div>
                  <Link
                    href={`/artists/${profile.artistId}`}
                    className="mt-4 inline-flex rounded-full bg-cyan-500 px-4 py-2 text-xs font-black text-white hover:bg-cyan-400"
                  >
                    상세 지수 차트 보기
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            데이터 안내
          </p>
          <h2 className="mt-2 text-2xl font-black">데이터 안내</h2>
          <ul className="mt-5 grid gap-3 text-sm font-bold leading-7 text-slate-600 md:grid-cols-2">
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              FANDEX 지수는 K-pop 아티스트 활동성과 반응 지표를 해석하기 위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가 아닙니다.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              현재 데이터는 FANDEX 등록/추적 아티스트 기준입니다.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              모든 K-pop 아티스트를 대표하지 않습니다.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              현재 차트는 에디토리얼 시드 / 미리보기 데이터 기반이며, 실제 공개 지표 검증과 자동 수집은 후속 단계입니다.
            </li>
          </ul>
        </section>
      </section>
    </main>
  );
}

function ArtistSelectorGroup({
  activeArtistId,
  activeMetricKey,
  compact = false,
  profiles,
  title,
}: {
  activeArtistId: string;
  activeMetricKey?: string;
  compact?: boolean;
  profiles: ArtistIndexChartProfile[];
  title: string;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-600">
          {title}
        </h3>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-500 shadow-sm">
          {profiles.length}
        </span>
      </div>
      <div
        className={
          compact
            ? 'mt-4 grid max-h-56 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6'
            : 'mt-4 grid max-h-80 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6'
        }
      >
        {profiles.map((profile) => {
          const active = profile.artistId === activeArtistId;
          return (
            <Link
              key={profile.artistId}
              href={buildChartHref({
                artistId: profile.artistId,
                metricKey: activeMetricKey,
              })}
              scroll={false}
              className={
                active
                  ? 'rounded-xl border border-cyan-300 bg-cyan-50 p-3 shadow-sm'
                  : 'rounded-xl border border-slate-200 bg-white p-3 hover:border-cyan-300'
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    {profile.artistName}
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    {profile.ticker} / {groupTypeLabels[profile.groupType]}
                  </p>
                </div>
                <StatusBadge status={profile.coverageStatus} />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function MetricContextPanel({
  definition,
  monthRangeLabel,
}: {
  definition: FandexMetricDefinition;
  monthRangeLabel: string;
}) {
  const legacyLabel = definition.legacyChartKey
    ? getMetricDisplayLabel(definition.legacyChartKey)
    : definition.label;
  const sourceInfo = getMetricSourceInfo(definition.key);

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600">
            이 지표는 무엇을 보나요?
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">
            {definition.label}
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
            {getMetricCategoryLabel(definition.key)}
          </span>
          <span className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
            {sourceInfo.displayLabel}
          </span>
        </div>
      </div>
      <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
        {definition.description}
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <MetricCard label="기본 반영 비중" value={formatMetricWeight(definition.defaultWeight)} />
        <MetricCard label="카테고리" value={getMetricCategoryLabel(definition.key)} />
        <MetricCard label="차트 연결" value={legacyLabel} />
      </div>
      <p className="mt-4 rounded-xl border border-cyan-100 bg-white p-3 text-xs font-bold leading-6 text-slate-500">
        현재 데이터 기준: {formatMetricMonth(FANDEX_METRIC_START_MONTH)}부터{' '}
        {formatMetricMonth(FANDEX_METRIC_END_MONTH)}까지의 월별 흐름이며,{' '}
        {monthRangeLabel} {sourceInfo.displayLabel}로 표시됩니다. {sourceInfo.description}
      </p>
    </article>
  );
}

function SelectedArtistMetricSummary({
  artistName,
  latestMetricBreakdown,
  metricDefinition,
  metricScore,
  topMetricItems,
}: {
  artistName: string;
  latestMetricBreakdown: ReturnType<typeof getLatestArtistMetricBreakdown>;
  metricDefinition: FandexMetricDefinition;
  metricScore: number | null;
  topMetricItems: ReturnType<typeof getTopMetricItemsForArtist>;
}) {
  const latestLabel = latestMetricBreakdown?.label ?? '데이터 준비중';

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600">
        선택 아티스트 최신 지표
      </p>
      <h3 className="mt-2 text-xl font-black text-slate-950">{artistName}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <MetricCard label="최신 기준" value={latestLabel} />
        <MetricCard
          label="선택 지표 점수"
          value={formatMetricScore(metricScore)}
        />
      </div>
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
          두드러진 지표
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {topMetricItems.length > 0 ? (
            topMetricItems.map((item) => (
              <span
                key={item.key}
                className={
                  item.key === metricDefinition.key
                    ? 'rounded-full bg-cyan-500 px-3 py-1 text-xs font-black text-white'
                    : 'rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm'
                }
              >
                {item.shortLabel || item.label} · {item.score}점
              </span>
            ))
          ) : (
            <span className="text-sm font-bold text-slate-500">
              preview seed 기준으로 표시할 수 있는 값이 없습니다.
            </span>
          )}
        </div>
      </div>
      <p className="mt-4 text-xs font-bold leading-6 text-slate-500">
        공식 평가가 아니라 FANDEX MVP preview seed 기준의 반응 점수입니다.
      </p>
    </article>
  );
}

function ChartSourceInsightPanel({
  artistName,
  insight,
  metricLabel,
}: {
  artistName: string;
  insight: NewsIssueChartInsight;
  metricLabel: string;
}) {
  return (
    <article className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600">
            source seed insight
          </p>
          <h3 className="mt-2 text-xl font-black text-slate-950">
            source seed 기반 차트 해석 보조 정보
          </h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
          read-only
        </span>
      </div>

      {insight.hasEvidence ? (
        <>
          <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
            {insight.displayNote} 현재 FANDEX 포인트 계산에는 직접 반영하지
            않습니다. 외부 API나 DB와 연결되어 있지 않습니다.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="선택 아티스트" value={artistName} />
            <MetricCard label="선택 지표 이름" value={metricLabel} />
            <MetricCard
              label="연결된 source item 수"
              value={`${insight.itemCount}개`}
            />
            <MetricCard
              label="평균 이슈 강도"
              value={formatOptionalIssueScore(insight.averageIssueScore)}
            />
            <MetricCard
              label="최고 이슈 강도"
              value={formatOptionalIssueScore(insight.maxIssueScore)}
            />
            <MetricCard
              label="최신 반영 날짜"
              value={insight.latestPublishedDate ?? 'source seed 없음'}
            />
            <MetricCard
              label="category 분포"
              value={formatCountMap(insight.categoryCounts)}
            />
            <MetricCard
              label="sentiment 분포"
              value={formatCountMap(insight.sentimentCounts)}
            />
          </div>
          <p className="mt-4 rounded-xl border border-cyan-100 bg-white p-4 text-sm font-bold leading-7 text-slate-600">
            {insight.interpretationSummary}
          </p>
          <p className="mt-3 text-xs font-bold leading-6 text-slate-500">
            개별 source item 목록은 아티스트 상세의 source seed 요약에서 확인할 수 있습니다.
          </p>
        </>
      ) : (
        <p className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold leading-7 text-slate-600">
          현재 선택한 아티스트와 지표에 연결된 source seed 해석 근거는 없습니다.
          차트 값은 기존 preview seed 기준으로 표시됩니다. 이 보조 정보는
          FANDEX 포인트 계산에는 직접 반영하지 않습니다.
        </p>
      )}
    </article>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 break-words text-lg font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {title}
      </p>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li key={item} className="text-sm font-bold leading-6 text-slate-600">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }: { status: ArtistIndexCoverageStatus }) {
  return (
    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-cyan-700 shadow-sm">
      {coverageStatusLabels[status]}
    </span>
  );
}
