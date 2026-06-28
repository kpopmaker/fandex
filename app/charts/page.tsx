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

type ContentAngleSuggestion = {
  title: string;
  hook: string;
  whyItWorks: string;
  artistsToCompare: string[];
  factCheckChecklist: string[];
  formatSuggestion: 'carousel' | 'short_form' | 'thread' | 'newsletter';
  caution: string;
};

const trendBandLabels: Record<ArtistIndexTrendBand, string> = {
  rising: '상승 흐름',
  stable: '안정 흐름',
  falling: '하락 흐름',
  volatile: '변동 확대',
  insufficient_data: '데이터 부족',
};

const similarityBandLabels: Record<ArtistIndexSimilarityBand, string> = {
  very_high: '매우 높음',
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const coverageStatusLabels: Record<ArtistIndexCoverageStatus, string> = {
  tracked: 'tracked',
  partial: 'partial',
  preview: 'preview',
};

const groupTypeLabels: Record<ArtistIndexGroupType, string> = {
  girl_group: 'girl group',
  boy_group: 'boy group',
  solo: 'solo',
  mixed: 'mixed',
  unit: 'unit',
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
    rising: '최근 8개 시점 기준 누적 포인트가 꾸준히 상승하는 흐름입니다.',
    stable: '최근 8개 시점 기준 누적 포인트가 비교적 안정적으로 유지되는 흐름입니다.',
    falling: '최근 8개 시점 기준 누적 포인트가 낮아지는 구간이 있어 추가 확인이 필요합니다.',
    volatile: '최근 8개 시점 기준 주간 변동 폭이 커져 흐름 재확인이 필요합니다.',
    insufficient_data: '최근 흐름을 판단하기에는 시점 데이터가 부족합니다.',
  };

  return `${trendCopy[trendBand]} 현재 문장은 베타 editorial seed 기반이며, 최근 변화는 ${formatDelta(delta)}입니다.`;
}

function getContentCheckpoints(signals: string[]) {
  const checkpoints = new Set<string>([
    '콘텐츠 발행 전 공식 영상 반응을 재확인하세요.',
    '최근 뉴스량과 반복 노출 여부를 외부 플랫폼에서 확인하세요.',
  ]);

  if (signals.some((signal) => signal.includes('SNS'))) {
    checkpoints.add('SNS 확산 게시물과 댓글 반응을 분리해서 확인하세요.');
  }

  if (signals.some((signal) => signal.includes('Brand'))) {
    checkpoints.add('브랜드 노출 이후 팬덤 밖 언급이 붙었는지 확인하세요.');
  }

  if (signals.some((signal) => signal.includes('Activity'))) {
    checkpoints.add('공식 활동 일정과 콘텐츠 공개 시점을 함께 확인하세요.');
  }

  return Array.from(checkpoints).slice(0, 3);
}

function getFactCheckChecklistBySignals(signals: string[]) {
  const checklist = new Set<string>([
    '공식 영상 반응 확인',
    '최근 뉴스량 확인',
    'SNS 확산 게시물 확인',
  ]);

  if (signals.some((signal) => signal.includes('Brand'))) {
    checklist.add('브랜드 캠페인 노출 시점 확인');
  }

  if (signals.some((signal) => signal.includes('Music'))) {
    checklist.add('음원/음반 공개 일정 확인');
  }

  if (signals.some((signal) => signal.includes('Activity'))) {
    checklist.add('활동 일정 확인');
  }

  return Array.from(checklist).slice(0, 4);
}

function getFormatLabel(format: ContentAngleSuggestion['formatSuggestion']) {
  const labels: Record<ContentAngleSuggestion['formatSuggestion'], string> = {
    carousel: '캐러셀',
    short_form: '숏폼',
    thread: '스레드',
    newsletter: '뉴스레터',
  };

  return labels[format];
}

function createContentAngleSuggestions(
  baseProfile: ArtistIndexChartProfile,
  similarResults: ArtistIndexSimilarityResult[],
) {
  const topResults = similarResults.slice(0, 5);
  const baseSignals = calculateDominantSignals(baseProfile.history);
  const topArtists = topResults.slice(0, 3).map((result) => result.comparedArtistName);
  const firstSignals = topResults[0]?.sharedDominantSignals ?? baseSignals;
  const secondSignals = topResults[1]?.sharedDominantSignals ?? baseSignals;
  const thirdSignals = topResults[2]?.sharedDominantSignals ?? baseSignals;

  const suggestions: ContentAngleSuggestion[] = [
    {
      title: '활동 전부터 지표 흐름이 먼저 움직인 팀들',
      hook: '활동이 본격화되기 전, 팬덤 반응이 먼저 올라오는 팀들의 공통점은 무엇일까?',
      whyItWorks: `${baseProfile.artistName}와 ${topArtists[0] ?? '유사 아티스트'}에서 유사한 상승 흐름과 ${firstSignals.join(', ')} 신호가 함께 관찰됩니다.`,
      artistsToCompare: [baseProfile.artistName, ...topArtists.slice(0, 2)],
      factCheckChecklist: getFactCheckChecklistBySignals(firstSignals),
      formatSuggestion: 'carousel',
      caution: 'FANDEX는 내부 참고 도구로만 사용하고, 외부 콘텐츠에는 직접 언급을 보류하세요.',
    },
    {
      title: '브랜드 노출 이후 흐름이 비슷해진 아티스트들',
      hook: '브랜드 캠페인 이후 팬덤 밖 언급이 붙는 팀들은 어떤 특징이 있을까?',
      whyItWorks: `${secondSignals.join(', ')}가 함께 잡히는 케이스를 묶어 비교하기 쉽습니다.`,
      artistsToCompare: [baseProfile.artistName, ...topArtists.slice(1, 3)],
      factCheckChecklist: getFactCheckChecklistBySignals([
        ...secondSignals,
        'Brand-fit signal',
      ]),
      formatSuggestion: 'short_form',
      caution: '브랜드 노출과 실제 반응의 인과관계는 단정하지 말고 외부 지표로 재확인하세요.',
    },
    {
      title: 'SNS 반응이 뉴스 노출보다 먼저 보이는 흐름',
      hook: '뉴스가 커지기 전 팬덤 커뮤니티와 짧은 영상 반응이 먼저 움직이는 순간은 언제일까?',
      whyItWorks: `${baseProfile.artistName} 기준 강한 신호가 ${baseSignals.join(', ')}로 잡혀 콘텐츠 관찰 포인트를 만들 수 있습니다.`,
      artistsToCompare: [baseProfile.artistName, ...topArtists.slice(0, 3)],
      factCheckChecklist: getFactCheckChecklistBySignals([
        ...baseSignals,
        'SNS/fandom response',
      ]),
      formatSuggestion: 'thread',
      caution: '플랫폼별 반응 규모가 다르므로 단일 지표만으로 결론을 내리지 마세요.',
    },
    {
      title: '안정적인 팬덤 기반 위에 대중 노출이 붙은 케이스',
      hook: '팬덤 기반이 유지되는 동안 외부 노출이 붙으면 지표 흐름은 어떻게 달라질까?',
      whyItWorks: `${thirdSignals.join(', ')}를 중심으로 안정 흐름과 상승 흐름을 함께 설명할 수 있습니다.`,
      artistsToCompare: [baseProfile.artistName, ...topArtists.slice(2, 5)],
      factCheckChecklist: getFactCheckChecklistBySignals(thirdSignals),
      formatSuggestion: 'newsletter',
      caution: '공식 평가처럼 보이는 표현을 피하고, 관찰 가능한 공개 신호 중심으로 작성하세요.',
    },
  ];

  if (topResults.length >= 4) {
    suggestions.push({
      title: '비슷한 모멘텀 차트가 만든 콘텐츠 묶음',
      hook: '서로 다른 팀이지만 같은 주간 구간에서 지표 흐름이 닮아 보이는 이유는 무엇일까?',
      whyItWorks: '유사 흐름 아티스트를 한 번에 묶어 팬덤 반응, 활동 시점, 콘텐츠 공개 타이밍을 비교할 수 있습니다.',
      artistsToCompare: [baseProfile.artistName, ...topArtists],
      factCheckChecklist: getFactCheckChecklistBySignals(baseSignals),
      formatSuggestion: 'carousel',
      caution: '흐름 유사성은 우열 비교가 아니라 콘텐츠 주제 발굴용 관찰값입니다.',
    });
  }

  return suggestions.slice(0, 6);
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
  const contentView =
    selectedResults[0]?.commonThemeCandidates[0] ??
    '기준 아티스트와 비교 대상의 공통 신호를 중심으로 콘텐츠 관점을 만드세요.';

  return {
    mostSimilar,
    mostDifferent,
    commonSignals,
    contentView,
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
                  {point.date.replace('2026-', '')}
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
        aria-label="기준 아티스트와 유사 아티스트의 정규화 지표 흐름 비교"
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
  const contentCheckpoints = getContentCheckpoints(baseDominantSignals);
  const contentAngles = createContentAngleSuggestions(
    baseProfile,
    similarResults,
  );
  const compareInterpretation = getCompareInterpretation({
    compareProfiles,
    similarResults,
  });

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="rounded-3xl border border-cyan-200 bg-white p-7 shadow-lg shadow-cyan-100/60">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">
            Editorial Preview / Beta Research Tool
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            FANDEX 지수 차트
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
            FANDEX 등록 아티스트의 지표 흐름을 비교하고, 비슷한 움직임을
            보이는 아티스트를 찾아 콘텐츠 주제 후보를 발굴합니다.
          </p>
          <p className="mt-4 max-w-3xl rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm font-bold leading-7 text-yellow-900">
            현재 차트는 베타 editorial seed 기반이며, 공식 순위/공식 평가/금융
            정보가 아닙니다.
          </p>
          <Link
            href={`/compare?artists=${chartProfiles
              .map((profile) => profile.artistId)
              .join(',')}`}
            className="mt-5 inline-flex rounded-full bg-cyan-500 px-5 py-3 text-xs font-black text-white hover:bg-cyan-400"
          >
            Multi Artist Compare에서 6개월 비교하기
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
                Coverage / Trust Notice
              </p>
              <h2 className="mt-2 text-2xl font-black">
                FANDEX 등록/추적 아티스트 기준
              </h2>
              <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600">
                현재 차트는 모든 K-pop 아티스트를 대표하지 않으며 FANDEX
                등록/추적 아티스트 기준입니다. Coverage는 주요 활동성, 검색성, 팬덤 반응을
                고려한 editorial seed 기준으로 순차 확장 중입니다. 실제 콘텐츠
                발행 전 외부 공개 지표를 1회 이상 재확인하세요. 시스템 신뢰도
                구축 전까지 외부 콘텐츠에는 FANDEX 직접 언급을 보류합니다.
              </p>
            </div>
            <span className="rounded-full bg-cyan-50 px-4 py-2 text-xs font-black text-cyan-700">
              {coverageSummary.dataStatus}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="total" value={coverageSummary.totalArtistCount.toString()} />
            <MetricCard label="tracked" value={coverageSummary.trackedArtistCount.toString()} />
            <MetricCard label="partial" value={coverageSummary.partialArtistCount.toString()} />
            <MetricCard label="preview" value={coverageSummary.previewArtistCount.toString()} />
            <MetricCard label="last updated" value={coverageSummary.lastUpdated} />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard label="girl group" value={coverageSummary.girlGroupCount.toString()} />
            <MetricCard label="boy group" value={coverageSummary.boyGroupCount.toString()} />
            <MetricCard label="solo" value={coverageSummary.soloCount.toString()} />
            <MetricCard label="unit" value={coverageSummary.unitCount.toString()} />
            <MetricCard label="mixed" value={coverageSummary.mixedCount.toString()} />
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
                아티스트를 바꿔 지표 흐름 확인
              </h2>
              <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
                tracked를 먼저 보여주고 partial/preview는 별도 섹션으로
                구분했습니다. 비교 대상이 없으면 비슷한 흐름 상위 3명을 자동
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
              title="Tracked artists"
              profiles={groupedProfiles.tracked}
            />
            <ArtistSelectorGroup
              activeArtistId={baseProfile.artistId}
              title="Partial coverage"
              profiles={groupedProfiles.partial}
              compact
            />
            <ArtistSelectorGroup
              activeArtistId={baseProfile.artistId}
              title="Preview coverage"
              profiles={groupedProfiles.preview}
              compact
            />
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Base Artist Summary
            </p>
            <h2 className="mt-2 text-3xl font-black">{baseProfile.artistName}</h2>
            <p className="mt-1 text-sm font-bold text-slate-500">
              {baseProfile.ticker} / {groupTypeLabels[baseProfile.groupType]} /{' '}
              {coverageStatusLabels[baseProfile.coverageStatus]}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MetricCard label="latest FANDEX 지수" value={formatPoint(baseLatest.fandexPoint)} />
              <MetricCard label="recent delta" value={formatDelta(calculateIndexDelta(baseProfile.history))} />
              <MetricCard label="trend band" value={trendBandLabels[getIndexTrendBand(baseProfile.history)]} />
              <MetricCard label="last updated" value={baseProfile.lastUpdated} />
              <MetricCard label="data status" value={baseLatest.dataStatus} />
              <MetricCard label="confidence level" value={baseLatest.confidenceLevel} />
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
              <InfoList title="강한 신호" items={baseDominantSignals.slice(0, 3)} />
              <InfoList title="콘텐츠 확인 포인트" items={contentCheckpoints} />
            </div>
          </article>
          <MiniLineChart profile={baseProfile} title="최근 8개 시점 지수 차트" />
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Compare Chart
            </p>
            <h2 className="mt-2 text-2xl font-black">유사 흐름 비교</h2>
            <p className="mt-2 text-sm font-bold leading-7 text-slate-600">
              기준 아티스트와 비교 대상의 FANDEX 지표 흐름을 같은 기간 기준으로
              봅니다. 이 표시는 우열이 아니라 흐름 유사성과 공통 신호 확인용입니다.
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
              콘텐츠로 묶을 수 있는 관점: {compareInterpretation.contentView}
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            Similar Movement Cards
          </p>
          <h2 className="mt-2 text-2xl font-black">비슷한 지표 흐름</h2>
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
                      label="latest point"
                      value={latest ? formatPoint(latest.fandexPoint) : '-'}
                    />
                    <MetricCard
                      label="delta point"
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
            Content Angle Builder v1
          </p>
          <h2 className="mt-2 text-2xl font-black">콘텐츠 주제 후보</h2>
          <p className="mt-2 max-w-4xl text-sm font-bold leading-7 text-slate-600">
            아래 후보는 기준 아티스트와 유사 흐름 결과를 바탕으로 만든 내부
            기획용 초안입니다. 외부 콘텐츠에는 FANDEX 직접 언급을 보류하고,
            발행 전 공개 지표를 다시 확인하세요.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {contentAngles.map((angle) => (
              <article
                key={angle.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="max-w-xl text-xl font-black text-slate-950">
                    {angle.title}
                  </h3>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                    {getFormatLabel(angle.formatSuggestion)}
                  </span>
                </div>
                <p className="mt-4 text-sm font-black leading-7 text-slate-700">
                  {angle.hook}
                </p>
                <p className="mt-3 text-sm font-bold leading-7 text-slate-600">
                  {angle.whyItWorks}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {angle.artistsToCompare.map((artist) => (
                    <span
                      key={artist}
                      className="rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700"
                    >
                      {artist}
                    </span>
                  ))}
                </div>
                <InfoList
                  title="발행 전 확인할 외부 지표"
                  items={angle.factCheckChecklist}
                />
                <p className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs font-bold leading-6 text-slate-500">
                  {angle.caution}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            Usage Guardrail
          </p>
          <h2 className="mt-2 text-2xl font-black">사용 가드레일</h2>
          <ul className="mt-5 grid gap-3 text-sm font-bold leading-7 text-slate-600 md:grid-cols-2">
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              외부 콘텐츠에 FANDEX 직접 언급은 시스템 신뢰도 구축 전까지 보류
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              콘텐츠 발행 전 외부 플랫폼에서 수치 1회 이상 재확인
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              “FANDEX 등록 아티스트 기준 흐름”으로만 해석
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              이 페이지는 콘텐츠 기획용 preview이며 공식 순위가 아님
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
