import Link from 'next/link';
import {
  artistIndexChartProfiles,
  calculateIndexDelta,
  getCoverageSummary,
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

type ChartSearchParams = {
  artist?: string;
  compare?: string;
};

type ChartPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
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

function parseChartSearchParams(params: {
  [key: string]: string | string[] | undefined;
}): ChartSearchParams {
  const artistParam = params.artist;
  const compareParam = params.compare;

  return {
    artist: Array.isArray(artistParam) ? artistParam[0] : artistParam,
    compare: Array.isArray(compareParam) ? compareParam[0] : compareParam,
  };
}

function getDefaultProfile(profiles: ArtistIndexChartProfile[]) {
  return (
    profiles.find((profile) => profile.artistId === 'aespa') ??
    profiles.find((profile) => profile.coverageStatus === 'tracked') ??
    profiles[0]
  );
}

function getCompareArtistIds({
  baseArtistId,
  compareParam,
  profiles,
  similarResults,
}: {
  baseArtistId: string;
  compareParam?: string;
  profiles: ArtistIndexChartProfile[];
  similarResults: ArtistIndexSimilarityResult[];
}) {
  const validIds = new Set(profiles.map((profile) => profile.artistId));
  const requestedIds =
    compareParam
      ?.split(',')
      .map((id) => id.trim())
      .filter(Boolean) ?? [];
  const sourceIds =
    requestedIds.length > 0
      ? requestedIds
      : similarResults.slice(0, 3).map((result) => result.comparedArtistId);
  const uniqueIds: string[] = [];

  sourceIds.forEach((id) => {
    if (id !== baseArtistId && validIds.has(id) && !uniqueIds.includes(id)) {
      uniqueIds.push(id);
    }
  });

  return uniqueIds.slice(0, 4);
}

function getSelectedChartContext(
  params: ChartSearchParams,
  profiles: ArtistIndexChartProfile[],
) {
  const defaultProfile = getDefaultProfile(profiles);
  const baseProfile =
    profiles.find((profile) => profile.artistId === params.artist) ??
    defaultProfile;
  const similarResults = findSimilarIndexMovements(
    baseProfile.artistId,
    profiles,
  );
  const compareArtistIds = getCompareArtistIds({
    baseArtistId: baseProfile.artistId,
    compareParam: params.compare,
    profiles,
    similarResults,
  });
  const compareProfiles = compareArtistIds
    .map((id) => profiles.find((profile) => profile.artistId === id))
    .filter(Boolean) as ArtistIndexChartProfile[];

  return {
    baseProfile,
    similarResults,
    compareArtistIds,
    compareProfiles,
    chartProfiles: [baseProfile, ...compareProfiles],
    usingAutoCompare: !params.compare,
  };
}

function buildChartHref({
  artistId,
  compareArtistIds = [],
}: {
  artistId: string;
  compareArtistIds?: string[];
}) {
  const params = new URLSearchParams();
  const uniqueCompareIds = compareArtistIds
    .filter((id) => id !== artistId)
    .filter((id, index, ids) => ids.indexOf(id) === index)
    .slice(0, 4);

  params.set('artist', artistId);

  if (uniqueCompareIds.length > 0) {
    params.set('compare', uniqueCompareIds.join(','));
  }

  return `/charts?${params.toString()}`;
}

function formatPoint(value: number) {
  return `${new Intl.NumberFormat('ko-KR').format(value)}pt`;
}

function formatDelta(value: number) {
  return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('ko-KR').format(value)}pt`;
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
    '최근 1년 FANDEX 주가 흐름과 변화 pt를 함께 확인하세요.',
    '커버리지 상태와 신뢰도를 함께 확인하세요.',
  ]);

  if (signals.some((signal) => signal.includes('SNS'))) {
    checkpoints.add('SNS/팬덤 변수 흐름이 전체 FANDEX 주가와 같은 방향인지 확인하세요.');
  }

  if (signals.some((signal) => signal.includes('Brand'))) {
    checkpoints.add('브랜드 적합도 변수 흐름과 현재 FANDEX 주가 위치를 함께 확인하세요.');
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
  const coverageSummary = getCoverageSummary(profiles);
  const groupedProfiles = groupProfilesByCoverage(profiles);
  const {
    baseProfile,
    similarResults,
    compareArtistIds,
    compareProfiles,
    chartProfiles,
    usingAutoCompare,
  } = getSelectedChartContext(params, profiles);
  const baseLatest = getLatestPoint(baseProfile);
  const baseDominantSignals = calculateDominantSignals(baseProfile.history);
  const signalCheckpoints = getSignalCheckpoints(baseDominantSignals);
  const compareInterpretation = getCompareInterpretation({
    compareProfiles,
    similarResults,
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="rounded-3xl border border-cyan-200 bg-white p-7 shadow-lg shadow-cyan-100/60">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">
            FANDEX 리서치 미리보기
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            FANDEX 주가 차트
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            FANDEX 등록/추적 아티스트 기준으로 주가형 지수 흐름을 확인하고,
            비슷한 움직임을 보이는 아티스트의 변수 흐름을 함께 확인합니다.
          </p>
          <p className="mt-4 max-w-3xl rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold leading-7 text-yellow-900">
            FANDEX 주가는 K-pop 아티스트 활동성과 반응 지표를 해석하기
            위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가
            아닙니다.
          </p>
          <Link
            href={`/compare?artists=${chartProfiles
              .map((profile) => profile.artistId)
              .join(',')}`}
            className="mt-5 inline-flex rounded-full bg-cyan-500 px-5 py-3 text-xs font-black text-white hover:bg-cyan-400"
          >
            아티스트 비교에서 최근 1년 흐름 보기
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
                데이터 안내
              </p>
              <h2 className="mt-2 text-2xl font-black">
                FANDEX 등록/추적 아티스트 기준
              </h2>
              <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600">
                현재 데이터는 FANDEX 등록/추적 아티스트 기준입니다. 모든
                K-pop 아티스트를 대표하지 않습니다. 현재 차트는 에디토리얼
                시드 / 미리보기 데이터 기반이며, 실제 공개 지표 검증과 자동 수집은
                후속 단계입니다.
              </p>
            </div>
            <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700">
              {coverageSummary.dataStatus}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="전체 아티스트" value={coverageSummary.totalArtistCount.toString()} />
            <MetricCard label="지속 추적" value={coverageSummary.trackedArtistCount.toString()} />
            <MetricCard label="일부 반영" value={coverageSummary.partialArtistCount.toString()} />
            <MetricCard label="미리보기" value={coverageSummary.previewArtistCount.toString()} />
            <MetricCard label="마지막 업데이트" value={coverageSummary.lastUpdated} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="걸그룹" value={coverageSummary.girlGroupCount.toString()} />
            <MetricCard label="보이그룹" value={coverageSummary.boyGroupCount.toString()} />
            <MetricCard label="솔로" value={coverageSummary.soloCount.toString()} />
            <MetricCard label="유닛" value={coverageSummary.unitCount.toString()} />
            <MetricCard label="혼성" value={coverageSummary.mixedCount.toString()} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge status="tracked" />
            <StatusBadge status="partial" />
            <StatusBadge status="preview" />
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
                아티스트는 별도 섹션으로 구분합니다. 비교 대상이 없으면 유사 흐름 상위 3명을 자동
                추천합니다.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-600">
              비교 대상 자동 추천: {usingAutoCompare ? '사용 중' : '직접 선택'}
            </span>
          </div>
          <div className="mt-5 grid gap-5">
            <ArtistSelectorGroup
              activeArtistId={baseProfile.artistId}
              title="지속 추적 아티스트"
              profiles={groupedProfiles.tracked}
            />
            <ArtistSelectorGroup
              activeArtistId={baseProfile.artistId}
              title="일부 반영 아티스트"
              profiles={groupedProfiles.partial}
              compact
            />
            <ArtistSelectorGroup
              activeArtistId={baseProfile.artistId}
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
              <MetricCard label="현재 FANDEX 주가" value={formatPoint(baseLatest.fandexPoint)} />
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
              <MiniLineChart profile={baseProfile} title="최근 1년 월별 주가 차트" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              비교 차트
            </p>
            <h2 className="mt-2 text-2xl font-black">유사 흐름 비교</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
              기준 아티스트와 비교 대상의 FANDEX 지수 흐름을 같은 기간 기준으로 봅니다.
              순위가 아니라 흐름의 유사성과 공통 신호를 확인하기 위한 차트입니다.
            </p>
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
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            유사 흐름 카드
          </p>
          <h2 className="mt-2 text-2xl font-black">비슷한 지수 흐름</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {similarResults.slice(0, 6).map((result) => {
              const profile = profiles.find(
                (item) => item.artistId === result.comparedArtistId,
              );
              const latest = profile ? getLatestPoint(profile) : null;
              const isComparing = compareArtistIds.includes(result.comparedArtistId);
              const nextCompareIds = isComparing
                ? compareArtistIds
                : [...compareArtistIds, result.comparedArtistId].slice(0, 4);

              return (
                <article
                  key={result.comparedArtistId}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-black text-slate-950">
                        {result.comparedArtistName}
                      </h3>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-700">
                        유사도 {similarityBandLabels[result.similarityBand]}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
                      {trendBandLabels[result.sharedTrendBand]}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MetricCard
                      label="현재 FANDEX 주가"
                      value={latest ? formatPoint(latest.fandexPoint) : '-'}
                    />
                    <MetricCard
                      label="변화 pt"
                      value={profile ? formatDelta(calculateIndexDelta(profile.history)) : '-'}
                    />
                  </div>
                  <p className="mt-4 text-sm font-bold leading-7 text-slate-600">
                    {result.editorialSummary}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {result.sharedDominantSignals.map((signal) => (
                      <span
                        key={signal}
                        className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700"
                      >
                        {signal}
                      </span>
                    ))}
                  </div>
                  <ul className="mt-4 grid gap-2">
                    {result.commonThemeCandidates.slice(0, 3).map((theme) => (
                      <li
                        key={theme}
                        className="text-sm font-bold leading-6 text-slate-600"
                      >
                        {theme}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold leading-6 text-slate-500">
                    {result.cautionNote}
                  </p>
                  <Link
                    href={buildChartHref({
                      artistId: baseProfile.artistId,
                      compareArtistIds: nextCompareIds,
                    })}
                    className={
                      isComparing
                        ? 'mt-4 inline-flex rounded-full bg-slate-200 px-4 py-2 text-xs font-black text-slate-600'
                        : 'mt-4 inline-flex rounded-full bg-cyan-500 px-4 py-2 text-xs font-black text-white hover:bg-cyan-400'
                    }
                  >
                    {isComparing ? '비교 중' : '비교에 추가'}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            지수 해석 메모
          </p>
          <h2 className="mt-2 text-2xl font-black">주가형 지수 해석 메모</h2>
          <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600">
            선택한 아티스트의 최근 1년 FANDEX 주가 흐름, 변화 pt, 흐름 구간을 함께 보며
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
                      label="현재 FANDEX 주가"
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
                    상세 주가 차트 보기
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
              FANDEX 주가는 K-pop 아티스트 활동성과 반응 지표를 해석하기 위한 엔터테인먼트 리서치 지수이며, 금융상품/투자정보가 아닙니다.
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
  compact = false,
  profiles,
  title,
}: {
  activeArtistId: string;
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
              href={buildChartHref({ artistId: profile.artistId })}
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
