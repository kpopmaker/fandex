import Link from 'next/link';
import FandexLineChart from './components/FandexLineChart';
import ArtistSearch from './components/v3/ArtistSearch';
import { artistUniverse, getArtistV3ById } from './data/v3/artistUniverse';
import { trendingIssues } from './data/v3/mockData';
import { artistUniverseV4 } from './data/v4/artistUniverse';
import { getArtistPriceHistoryV4 } from './data/v4/artistPriceHistory';
import {
  getKpopMarketChartPointsV4,
  getKpopMarketIndexSummaryV4,
} from './data/v4/marketIndex';
import type { IssueScoreBreakdown } from './data/v4/scoring/types';
import type { KpopIssue } from './data/v3/types';

function formatSignalFlow(value: number) {
  if (value > 0) {
    return `상승 흐름 ${value.toFixed(2)}pt`;
  }

  if (value < 0) {
    return `하락 관찰 ${Math.abs(value).toFixed(2)}pt`;
  }

  return '보합 흐름';
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 2,
  }).format(value);
}

function safeNumber(value: number | null | undefined, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safePositiveNumber(value: number | null | undefined, fallback = 0) {
  return Math.max(safeNumber(value, fallback), 0);
}

function clampScore(value: number | null | undefined, fallback = 0) {
  return Math.min(Math.max(safeNumber(value, fallback), 0), 100);
}

type MarketClimateTone = 'positive' | 'balanced' | 'watch' | 'risk';

type MarketIssueClimate = {
  label:
    | 'Positive climate'
    | 'Balanced climate'
    | 'Watch climate'
    | 'Risk climate';
  tone: MarketClimateTone;
  copy: string;
  avgIssueScore: number;
  avgControversyRiskScore: number;
  avgConfidenceScore: number;
  totalActiveIssueCount: number;
  totalPositiveIssueCount: number;
  totalNegativeIssueCount: number;
  positiveArtistCount: number;
  neutralArtistCount: number;
  watchArtistCount: number;
  riskArtistCount: number;
  artistCount: number;
};

function getIssueTone({
  issueScore,
  controversyRiskScore,
  positiveIssueCount,
  negativeIssueCount,
}: {
  issueScore: number;
  controversyRiskScore: number;
  positiveIssueCount: number;
  negativeIssueCount: number;
}): 'positive' | 'neutral' | 'watch' | 'risk' {
  if (controversyRiskScore >= 65) {
    return 'risk';
  }

  if (
    issueScore <= 40 ||
    controversyRiskScore >= 35 ||
    negativeIssueCount > positiveIssueCount
  ) {
    return 'watch';
  }

  if (issueScore >= 60 && controversyRiskScore < 50) {
    return 'positive';
  }

  return 'neutral';
}

function getMarketClimateLabel({
  avgIssueScore,
  avgControversyRiskScore,
  totalActiveIssueCount,
  totalPositiveIssueCount,
  totalNegativeIssueCount,
  riskArtistCount,
  artistCount,
}: Pick<
  MarketIssueClimate,
  | 'avgIssueScore'
  | 'avgControversyRiskScore'
  | 'totalActiveIssueCount'
  | 'totalPositiveIssueCount'
  | 'totalNegativeIssueCount'
  | 'riskArtistCount'
  | 'artistCount'
>): Pick<MarketIssueClimate, 'label' | 'tone' | 'copy'> {
  const riskShare = artistCount > 0 ? riskArtistCount / artistCount : 0;

  if (totalActiveIssueCount === 0) {
    return {
      label: 'Balanced climate',
      tone: 'balanced',
      copy: 'No active market issue signals are currently reflected.',
    };
  }

  if (avgControversyRiskScore >= 65 || riskShare >= 0.35) {
    return {
      label: 'Risk climate',
      tone: 'risk',
      copy: 'Watch signals are elevated across several tracked artists.',
    };
  }

  if (avgIssueScore <= 40 || totalNegativeIssueCount > totalPositiveIssueCount) {
    return {
      label: 'Watch climate',
      tone: 'watch',
      copy: 'Watch signals are slightly stronger than positive issue momentum.',
    };
  }

  if (avgIssueScore >= 60 && avgControversyRiskScore < 50) {
    return {
      label: 'Positive climate',
      tone: 'positive',
      copy: 'Positive issue momentum is slightly stronger across the tracked artist universe.',
    };
  }

  return {
    label: 'Balanced climate',
    tone: 'balanced',
    copy: 'K-pop issue signals are currently balanced across the tracked artist universe.',
  };
}

function getMarketIssueClimate(): MarketIssueClimate {
  const summaries = artistUniverseV4.map((artist) => {
    const history = getArtistPriceHistoryV4(artist.id);
    const latest = history[history.length - 1];
    const breakdown: IssueScoreBreakdown | undefined =
      latest?.issueScoreBreakdown ?? latest?.scoreBreakdown.issueScoreBreakdown;
    const summary = latest?.issueSignalsSummary;
    const issueScore = clampScore(breakdown?.issueScore, 50);
    const controversyRiskScore = clampScore(breakdown?.controversyRiskScore);
    const confidenceScore = clampScore(breakdown?.confidenceScore, 50);
    const activeIssueCount = Math.round(
      safePositiveNumber(summary?.activeIssueCount)
    );
    const positiveIssueCount = Math.round(
      safePositiveNumber(summary?.positiveIssueCount)
    );
    const negativeIssueCount = Math.round(
      safePositiveNumber(summary?.negativeIssueCount)
    );

    return {
      issueScore,
      controversyRiskScore,
      confidenceScore,
      activeIssueCount,
      positiveIssueCount,
      negativeIssueCount,
      tone: getIssueTone({
        issueScore,
        controversyRiskScore,
        positiveIssueCount,
        negativeIssueCount,
      }),
    };
  });
  const artistCount = summaries.length;

  if (artistCount === 0) {
    return {
      label: 'Balanced climate',
      tone: 'balanced',
      copy: 'No active market issue signals are currently reflected.',
      avgIssueScore: 50,
      avgControversyRiskScore: 0,
      avgConfidenceScore: 50,
      totalActiveIssueCount: 0,
      totalPositiveIssueCount: 0,
      totalNegativeIssueCount: 0,
      positiveArtistCount: 0,
      neutralArtistCount: 0,
      watchArtistCount: 0,
      riskArtistCount: 0,
      artistCount: 0,
    };
  }

  const totals = summaries.reduce(
    (acc, summary) => ({
      issueScore: acc.issueScore + summary.issueScore,
      controversyRiskScore:
        acc.controversyRiskScore + summary.controversyRiskScore,
      confidenceScore: acc.confidenceScore + summary.confidenceScore,
      activeIssueCount: acc.activeIssueCount + summary.activeIssueCount,
      positiveIssueCount: acc.positiveIssueCount + summary.positiveIssueCount,
      negativeIssueCount: acc.negativeIssueCount + summary.negativeIssueCount,
      positiveArtistCount:
        acc.positiveArtistCount + (summary.tone === 'positive' ? 1 : 0),
      neutralArtistCount:
        acc.neutralArtistCount + (summary.tone === 'neutral' ? 1 : 0),
      watchArtistCount:
        acc.watchArtistCount + (summary.tone === 'watch' ? 1 : 0),
      riskArtistCount: acc.riskArtistCount + (summary.tone === 'risk' ? 1 : 0),
    }),
    {
      issueScore: 0,
      controversyRiskScore: 0,
      confidenceScore: 0,
      activeIssueCount: 0,
      positiveIssueCount: 0,
      negativeIssueCount: 0,
      positiveArtistCount: 0,
      neutralArtistCount: 0,
      watchArtistCount: 0,
      riskArtistCount: 0,
    }
  );
  const avgIssueScore = totals.issueScore / artistCount;
  const avgControversyRiskScore = totals.controversyRiskScore / artistCount;
  const avgConfidenceScore = totals.confidenceScore / artistCount;
  const label = getMarketClimateLabel({
    avgIssueScore,
    avgControversyRiskScore,
    totalActiveIssueCount: totals.activeIssueCount,
    totalPositiveIssueCount: totals.positiveIssueCount,
    totalNegativeIssueCount: totals.negativeIssueCount,
    riskArtistCount: totals.riskArtistCount,
    artistCount,
  });

  return {
    ...label,
    avgIssueScore,
    avgControversyRiskScore,
    avgConfidenceScore,
    totalActiveIssueCount: totals.activeIssueCount,
    totalPositiveIssueCount: totals.positiveIssueCount,
    totalNegativeIssueCount: totals.negativeIssueCount,
    positiveArtistCount: totals.positiveArtistCount,
    neutralArtistCount: totals.neutralArtistCount,
    watchArtistCount: totals.watchArtistCount,
    riskArtistCount: totals.riskArtistCount,
    artistCount,
  };
}

function getIssueBadge(issue: KpopIssue) {
  if (issue.impact.toLowerCase().includes('down')) {
    return '주의';
  }

  if (issue.relatedArtistIds.length > 2) {
    return '혼조';
  }

  if (issue.impact.toLowerCase().includes('up')) {
    return '상승';
  }

  return '주목';
}

function getIssueBadgeClass(badge: string) {
  const classes: Record<string, string> = {
    상승: 'bg-red-400/10 text-red-300',
    주목: 'bg-cyan-400/10 text-cyan-600',
    혼조: 'bg-violet-400/10 text-violet-300',
    주의: 'bg-blue-400/10 text-blue-300',
  };

  return classes[badge] ?? classes.주목;
}

function getRelatedArtistLabel(issue: KpopIssue) {
  const names = issue.relatedArtistIds
    .map((artistId) => getArtistV3ById(artistId))
    .filter((artist): artist is NonNullable<typeof artist> => Boolean(artist))
    .map((artist) => artist.nameEn);

  return names.length > 0 ? names.join(', ') : '시장 전체';
}

function getHomepageIssueRows() {
  const fallbackIssues: KpopIssue[] = [
    {
      id: 'homepage-issue-fallback-001',
      rank: 1,
      headline: 'K-pop 시장 검색량 상승 예시',
      summary: '시장 전체 검색 흐름이 증가하는 상황을 가정한 mock 이슈입니다.',
      category: 'Issue',
      relatedArtistIds: [],
      relatedKeywords: ['search', 'market'],
      issueScore: 60,
      newsCount: 0,
      searchGrowthRate: 12,
      impact: 'Attention increased',
      updatedAt: 'mock',
      sourceNames: ['Mock'],
    },
    {
      id: 'homepage-issue-fallback-002',
      rank: 2,
      headline: '해외 반응 증가 예시',
      summary: '해외 팬 반응 증가를 가정한 mock 산업 리서치 신호입니다.',
      category: 'Global reaction',
      relatedArtistIds: [],
      relatedKeywords: ['global', 'reaction'],
      issueScore: 58,
      newsCount: 0,
      searchGrowthRate: 10,
      impact: 'Attention increased',
      updatedAt: 'mock',
      sourceNames: ['Mock'],
    },
  ];

  return Array.from({ length: 10 }, (_, index) => {
    const issue = trendingIssues[index] ?? fallbackIssues[index % fallbackIssues.length];

    return {
      ...issue,
      id: index < trendingIssues.length ? issue.id : `${issue.id}-${index + 1}`,
      rank: index + 1,
    };
  });
}

const publicPreviewItems = [
  { ko: '개요', en: 'Overview' },
  { ko: 'FANDEX 누적 포인트', en: 'FANDEX cumulative points' },
  { ko: '이슈 톤 미리보기', en: 'Issue tone preview' },
  { ko: '제한된 아티스트 메타데이터', en: 'Limited artist metadata' },
  { ko: '샘플 리포트 CTA', en: 'Sample report CTA' },
];

const earlyAccessReportItems = [
  { ko: '음원/음반 신호', en: 'Music / Album Signal' },
  { ko: '뉴스/이슈 신호', en: 'News / Issue Signal' },
  { ko: 'SNS/팬덤 신호', en: 'SNS / Fandom Signal' },
  { ko: '브랜드 적합도', en: 'Brand-fit analysis' },
  { ko: '아티스트 비교', en: 'Artist comparison' },
  { ko: 'AI 해석', en: 'AI interpretation' },
  { ko: '주간 리서치 리포트', en: 'Weekly FANDEX report' },
];

const snsResearchFunnelSteps = [
  {
    titleKo: 'FANDEX Signal 발견',
    titleEn: 'Discover a FANDEX Signal',
    copyKo: 'Instagram, X, LinkedIn 콘텐츠에서 K-pop과 엔터테인먼트 이슈를 데이터 관점으로 발견합니다.',
    copyEn: 'Instagram, X, and LinkedIn posts surface K-pop and entertainment issues with a data-first angle.',
  },
  {
    titleKo: '아티스트와 이슈 확인',
    titleEn: 'Check the artist or issue',
    copyKo: '방문자는 FANDEX에서 공개 신호, 아티스트 움직임, 이슈 톤의 맥락을 확인합니다.',
    copyEn: 'Visitors use FANDEX to verify the context behind a public signal, artist movement, or issue tone.',
  },
  {
    titleKo: '제한된 미리보기 확인',
    titleEn: 'Read the preview',
    copyKo: '무료 화면에서는 아티스트 기본 정보, 기본 점수, 이슈 톤만 제한적으로 보여줍니다.',
    copyEn: 'Free pages show only a limited preview: artist identity, basic score, and issue tone.',
  },
  {
    titleKo: '유료 카테고리 확인',
    titleEn: 'Review paid category unlocks',
    copyKo: 'Early Access 구독자에게는 카테고리 리서치, AI 해석, 비교, 주간 리포트가 제공될 예정입니다.',
    copyEn: 'Early Access subscribers are planned to receive category research, AI interpretation, comparisons, and weekly reports.',
  },
];

const waitlistRoleOptions = [
  'Entertainment marketer',
  'K-pop fan / community operator',
  'Brand marketer',
  'Job seeker / portfolio research',
  'Entertainment industry researcher',
  'Other',
];

const waitlistReportOptions = [
  'Weekly K-pop FANDEX report',
  'Artist watchlist',
  'Comeback / issue / brand signal summary',
  'Artist comparison brief',
  'Marketing insight memo',
];

export default function Home() {
  const latestMarket = getKpopMarketIndexSummaryV4();
  const marketChartPoints = getKpopMarketChartPointsV4();
  const highValue = latestMarket.highValue;
  const lowValue = latestMarket.lowValue;
  const periodLabel = `${marketChartPoints[0]?.time ?? '-'} - ${
    marketChartPoints[marketChartPoints.length - 1]?.time ?? '-'
  }`;
  const leadingIssue = trendingIssues[0];
  const issueRows = getHomepageIssueRows();
  const marketIssueClimate = getMarketIssueClimate();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr] xl:items-stretch">
          <div className="flex min-h-[520px] flex-col justify-between rounded-3xl border border-slate-200 bg-white p-7 shadow-lg shadow-slate-200/60">
            <div>
              <div className="mb-6">
                <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-600">
                  <LangText en="FANDEX K-pop Research Signals" ko="FANDEX K-pop 리서치 플랫폼" />
                </p>
                <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                  <LangText
                    en="FANDEX reads K-pop entertainment signals through data"
                    ko="K-pop과 엔터테인먼트 신호를 데이터로 읽는 FANDEX"
                  />
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                  <LangText
                    en="FANDEX is a research platform that analyzes K-pop and entertainment industry issues, fandom, brand, and activity signals with data."
                    ko="FANDEX는 K-pop과 엔터테인먼트 산업의 이슈, 팬덤, 브랜드, 활동 신호를 데이터 기반으로 분석하는 리서치 플랫폼입니다."
                  />
                </p>
                <p className="mt-4 max-w-3xl rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-900">
                  <LangText
                    en="FANDEX is an experimental K-pop and entertainment research indicator. It is not financial advice, an investment product, or an official certification score. Some screens currently use preview/mock/manual seed data, and formula detail may change during beta."
                    ko="FANDEX는 K-pop/엔터 산업을 분석하기 위한 실험적 리서치 지표입니다. 금융 조언이나 투자 상품이 아니며, 공식 인증 점수가 아닙니다. 현재 일부 화면은 preview/mock/manual seed 기반이며, 실제 데이터 연결과 세부 산식은 고도화될 수 있습니다."
                  />
                </p>
              </div>
              <p className="hidden text-sm font-black uppercase tracking-[0.28em] text-cyan-600">
                FANDEX K-pop Research Signals
              </p>
              <h1 className="hidden mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                K-pop 산업 흐름을 리서치 지표로 읽는 FANDEX
              </h1>
              <p className="hidden mt-5 max-w-3xl text-base leading-8 text-slate-600">
                FANDEX는 팬 반응, 검색량, 영상 반응, 뉴스량, 해외 반응을
                모아 아티스트와 이슈가 지금 얼마나 주목받는지 보여주는
                K-pop 리서치 플랫폼입니다.
              </p>
              <p className="hidden mt-4 max-w-3xl rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-900">
                FANDEX는 K-pop/엔터 산업을 분석하기 위한 실험적 리서치
                지표입니다. 금융 조언, 투자 상품, 공식 인증 점수가 아닙니다.
              </p>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="rounded-3xl border border-cyan-200 bg-slate-50 p-5 shadow-sm">
                <p className="text-sm font-black text-cyan-700">
                  FANDEX 누적 포인트
                </p>
                <p className="mt-2 font-mono text-5xl font-black text-slate-950">
                  {formatNumber(latestMarket.indexValue)}pt
                </p>
                <p className="mt-2 font-mono text-sm font-black text-red-300">
                  {formatSignalFlow(latestMarket.changeRate)} 오늘
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/compare?artists=aespa,ive,riize"
                  className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
                >
                  아티스트 비교하기
                </Link>
                <Link
                  href="/ranking"
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
                >
                  아티스트 리서치 랭킹
                </Link>
                <Link
                  href="/methodology"
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
                >
                  산출방식
                </Link>
                <Link
                  href="/coverage"
                  className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
                >
                  커버리지
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                  FANDEX Research Indicator
                </p>
                <h2 className="mt-2 text-2xl font-black">K-pop 리서치 지표 차트</h2>
                <p className="mt-1 text-sm text-slate-500">
                  기간 {periodLabel} · mock 리서치 흐름
                </p>
              </div>
              <span className="w-fit rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                Simulated
              </span>
            </div>

            <FandexLineChart
              ariaLabel="K-pop research indicator line chart"
              period={periodLabel}
              showArea
              height={260}
              minWidth={640}
              valueLocale="ko-KR"
              maximumFractionDigits={2}
              changeFractionDigits={2}
              series={[
                {
                  id: 'kpop-composite',
                  label: 'K-pop Research Indicator',
                  points: marketChartPoints.map((point) => ({
                    label: point.time,
                    value: point.value,
                  })),
                },
              ]}
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SnapshotCard
                label="현재 누적 포인트"
                value={`${formatNumber(latestMarket.indexValue)}pt`}
                detail={formatSignalFlow(latestMarket.changeRate)}
              />
              <SnapshotCard
                label="표시 구간 상단"
                value={`${formatNumber(highValue)}pt`}
                detail="표시 기간 기준"
              />
              <SnapshotCard
                label="표시 구간 하단"
                value={`${formatNumber(lowValue)}pt`}
                detail="표시 기간 기준"
              />
              <SnapshotCard
                label="관심량"
                value={formatLargeNumber(latestMarket.totalVolume)}
                detail="산업 흐름 관찰값"
              />
            </div>
          </div>
        </section>

        <MarketIssueClimateSection climate={marketIssueClimate} />

        <section className="rounded-3xl border-2 border-cyan-200 bg-white p-6 shadow-lg shadow-cyan-100/60">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                산업 신호 예시
              </p>
              <h2 className="mt-2 text-3xl font-black">
                실시간 이슈 TOP 10
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                예시 이슈를 기준으로 FANDEX 리서치 신호가 어떻게 보일지
                확인하는 영역입니다.
              </p>
            </div>

            <div className="grid gap-3">
              {issueRows.map((issue) => {
                const badge = getIssueBadge(issue);

                return (
                  <article
                    key={issue.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500 font-mono text-sm font-black text-white">
                          {issue.rank}
                        </span>
                        <div>
                          <h3 className="font-black">{issue.headline}</h3>
                          <p className="mt-1 text-xs font-bold text-slate-500">
                            관련 아티스트: {getRelatedArtistLabel(issue)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`w-fit rounded-full px-3 py-1 text-xs font-black ${getIssueBadgeClass(
                          badge
                        )}`}
                      >
                        {badge}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>

            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold leading-6 text-slate-500">
              현재 이슈 순위는 mock 데이터 기반 예시이며, 추후 실제 뉴스·검색량·SNS 반응 데이터와 연결될 예정입니다.
            </p>
        </section>

        <section>
          <ArtistSearch artists={artistUniverse} />
        </section>

        {leadingIssue && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                  Selected Issue Detail
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  선택 이슈 상세
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  이번 단계에서는 첫 번째 이슈의 상세 패널을 고정으로
                  보여줍니다. 실제 뉴스 상세 모달은 이후 단계에서 구현합니다.
                </p>
              </div>

              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cyan-500 px-2.5 py-1 text-xs font-black text-white">
                    #{leadingIssue.rank}
                  </span>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-500">
                    {leadingIssue.category}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black ${getIssueBadgeClass(
                      getIssueBadge(leadingIssue)
                    )}`}
                  >
                    {getIssueBadge(leadingIssue)}
                  </span>
                </div>
                <h3 className="mt-4 text-xl font-black">
                  {leadingIssue.headline}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {leadingIssue.summary}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <MiniMetric
                    label="검색 증가"
                    value={formatSignalFlow(leadingIssue.searchGrowthRate)}
                  />
                  <MiniMetric
                    label="뉴스량"
                    value={`${leadingIssue.newsCount} items`}
                  />
                  <MiniMetric
                    label="영향"
                    value={leadingIssue.impact}
                  />
                </div>
                <Link
                  href="/signals"
                  className="mt-5 inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
                >
                  리서치 신호 더 보기
                </Link>
              </article>
            </div>
          </section>
        )}

        <EarlyAccessSection />
      </section>
    </main>
  );
}

function EarlyAccessSection() {
  return (
    <section
      id="early-access"
      className="rounded-3xl border border-cyan-200 bg-white p-6 shadow-lg shadow-cyan-100/60"
    >
      <div className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            <LangText en="FANDEX Early Access" ko="FANDEX Early Access" />
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            <LangText
              en="K-pop and entertainment issues, verified for marketing context"
              ko="K-pop과 엔터테인먼트 이슈를 마케팅 관점으로 해석합니다"
            />
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            <LangText
              en="FANDEX is a research platform that verifies the latest K-pop and entertainment industry issues with public signal data, then interprets them from a marketing perspective."
              ko="FANDEX는 공개 신호 데이터를 바탕으로 K-pop과 엔터테인먼트 산업 이슈를 확인하고, 이를 마케팅과 브랜드 관점의 리서치로 정리합니다."
            />
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            <LangText
              en="FANDEX Signal content published on Instagram, X, and LinkedIn can bring readers back to the website for a limited free preview, sample reports, paid category unlock previews, and Early Access subscriber research."
              ko="SNS에서 FANDEX Signal 콘텐츠를 본 사용자는 웹사이트에서 제한된 무료 검색, 샘플 리포트, 유료 리서치 카테고리, Early Access 구독자 리서치를 확인할 수 있습니다."
            />
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800"
            >
              <LangText en="Try Limited Free Search" ko="제한된 무료 검색 시작하기" />
            </Link>
            <Link
              href="/research"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
            >
              <LangText en="See Paid Research Categories" ko="유료 리서치 카테고리 보기" />
            </Link>
            <Link
              href="/early-access"
              className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
            >
              <LangText en="Request Early Access" ko="Early Access 신청하기" />
            </Link>
            <Link
              href="/sample-report"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
            >
              <LangText en="View Sample Report" ko="샘플 리포트 보기" />
            </Link>
            <Link
              href="/early-access"
              className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700 shadow-sm hover:bg-cyan-100"
            >
              <LangText en="Join FANDEX Beta" ko="FANDEX 베타 신청" />
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <EarlyAccessCard
            eyebrow="무료 미리보기"
            title="제한된 무료 검색"
            items={publicPreviewItems}
          />
          <EarlyAccessCard
            eyebrow="구독자 리서치"
            title="유료 카테고리 unlock"
            items={earlyAccessReportItems}
          />
        </div>
      </div>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            <LangText en="From social signal to deeper research" ko="SNS 신호에서 심층 리서치까지" />
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">
            <LangText
              en="How FANDEX turns SNS attention into research demand"
              ko="FANDEX가 SNS 관심을 리서치 수요로 연결하는 방식"
            />
          </h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {snsResearchFunnelSteps.map((step, index) => (
            <article
              key={step.titleEn}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 font-mono text-sm font-black text-white">
                {index + 1}
              </span>
              <h4 className="mt-4 text-sm font-black text-slate-950">
                <LangText en={step.titleEn} ko={step.titleKo} />
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                <LangText en={step.copyEn} ko={step.copyKo} />
              </p>
            </article>
          ))}
        </div>
      </section>

      <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold leading-6 text-slate-500">
        <LangText
          en="FANDEX is an experimental entertainment research index. It is not financial advice or an investment product. Scores may change as signal logic and data coverage improve."
          ko="FANDEX는 K-pop/엔터 산업을 분석하기 위한 실험적 리서치 지표입니다. 금융 조언이나 투자 상품이 아니며, 공식 인증 점수가 아닙니다. 현재 일부 화면은 preview/mock/manual seed 기반이며, 실제 데이터 연결과 세부 산식은 고도화될 수 있습니다."
        />
      </p>

      <WaitlistPreviewCard />
    </section>
  );
}

function WaitlistPreviewCard() {
  const fieldClass =
    'mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100';

  return (
    <section
      id="waitlist-form"
      className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5"
    >
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            Waitlist preview
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">
            Join the FANDEX research waitlist
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Early Access is for readers who discover a K-pop or entertainment
            issue through FANDEX Signal content and want a deeper research brief.
            Your selected report type will help shape future beta reports and
            subscription tests.
          </p>
          <p className="mt-3 rounded-2xl border border-cyan-200 bg-white p-4 text-xs font-bold leading-6 text-cyan-800">
            This form is a preview UI. Form submission will be connected in the
            next MVP step.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-black text-slate-700">
            Name
            <input
              className={fieldClass}
              name="name"
              placeholder="Your name"
              type="text"
            />
          </label>

          <label className="text-sm font-black text-slate-700">
            Email
            <input
              className={fieldClass}
              name="email"
              placeholder="you@example.com"
              type="email"
            />
          </label>

          <label className="text-sm font-black text-slate-700">
            Role / use case
            <select className={fieldClass} defaultValue="" name="role">
              <option value="">Select a role</option>
              {waitlistRoleOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-black text-slate-700">
            Interested report type
            <select className={fieldClass} defaultValue="" name="reportType">
              <option value="">Select a report type</option>
              {waitlistReportOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2">
            <button
              type="button"
              className="w-full rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400 md:w-auto"
            >
              Request Early Access
            </button>
            <p className="mt-3 text-xs font-bold leading-6 text-slate-500">
              Early Access requests are not being stored yet in this preview.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function EarlyAccessCard({
  eyebrow,
  title,
  items,
}: {
  eyebrow: string;
  title: string;
  items: Array<{ ko: string; en: string }>;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
        {eyebrow}
      </p>
      <h3 className="mt-2 text-xl font-black text-slate-950">{title}</h3>
      <ul className="mt-4 grid gap-2">
        {items.map((item) => (
          <li
            key={item.en}
            className="rounded-xl border border-white bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm"
          >
            <LangText en={item.en} ko={item.ko} />
          </li>
        ))}
      </ul>
    </article>
  );
}

function MarketIssueClimateSection({
  climate,
}: {
  climate: MarketIssueClimate;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            산업 이슈 흐름
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black">뉴스와 이슈 흐름</h2>
            <MarketClimateBadge label={climate.label} tone={climate.tone} />
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            {climate.copy}
          </p>
          <p className="mt-3 text-xs font-bold text-slate-500">
            Tracked artists {climate.artistCount} / Positive{' '}
            {climate.positiveArtistCount} / Balanced{' '}
            {climate.neutralArtistCount} / Watch {climate.watchArtistCount} /
            Risk {climate.riskArtistCount}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MiniMetric
            label="Avg issue"
            value={String(Math.round(climate.avgIssueScore))}
          />
          <MiniMetric
            label="Avg risk"
            value={String(Math.round(climate.avgControversyRiskScore))}
          />
          <MiniMetric
            label="Avg confidence"
            value={String(Math.round(climate.avgConfidenceScore))}
          />
          <MiniMetric
            label="Active signals"
            value={String(climate.totalActiveIssueCount)}
          />
          <MiniMetric
            label="Positive signals"
            value={String(climate.totalPositiveIssueCount)}
          />
          <MiniMetric
            label="Watch signals"
            value={String(climate.totalNegativeIssueCount)}
          />
        </div>
      </div>
    </section>
  );
}

function MarketClimateBadge({
  label,
  tone,
}: {
  label: MarketIssueClimate['label'];
  tone: MarketClimateTone;
}) {
  const toneClass = {
    positive: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    balanced: 'border-slate-200 bg-slate-50 text-slate-600',
    watch: 'border-purple-200 bg-purple-50 text-purple-700',
    risk: 'border-blue-200 bg-blue-50 text-blue-700',
  }[tone];

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-black ${toneClass}`}
    >
      {label}
    </span>
  );
}

function SnapshotCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 font-mono text-xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
        {detail}
      </p>
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function LangText({ ko, en }: { ko: string; en: string }) {
  return (
    <>
      <span className="inline [html[data-language='en']_&]:hidden">{ko}</span>
      <span className="hidden [html[data-language='en']_&]:inline">{en}</span>
    </>
  );
}
