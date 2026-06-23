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

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
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
      summary: '해외 팬 반응 증가를 가정한 mock 시장 신호입니다.',
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
  'Artist quick search',
  'Public ranking snapshot',
  'Issue tone preview',
  'Sample report',
  'SNS signal archive preview',
];

const earlyAccessReportItems = [
  'AI interpretation',
  'Full artist research brief',
  'Brand-fit analysis',
  'Issue risk analysis',
  'Artist comparison report',
  'Weekly FANDEX report',
  'Watchlist and signal commentary',
];

const snsResearchFunnelSteps = [
  {
    title: 'Discover a FANDEX Signal',
    copy: 'Instagram, X, and LinkedIn posts surface K-pop and entertainment issues with a data-first angle.',
  },
  {
    title: 'Check the artist or issue',
    copy: 'Visitors use FANDEX to verify the context behind a public signal, artist movement, or issue tone.',
  },
  {
    title: 'Read the preview',
    copy: 'Free pages show ranking snapshots, sample interpretation, and signal previews before subscription.',
  },
  {
    title: 'Unlock deeper research',
    copy: 'Early Access subscribers receive AI interpretation, comparison briefs, and weekly FANDEX reports.',
  },
];

const waitlistRoleOptions = [
  'Entertainment marketer',
  'K-pop fan / community operator',
  'Brand marketer',
  'Job seeker / portfolio research',
  'Investor / market watcher',
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
              <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-600">
                FANDEX K-pop Market Intelligence
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                K-pop 시장의 관심 흐름을 숫자로 읽는 FANDEX
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                FANDEX는 팬 반응, 검색량, 영상 반응, 뉴스량, 해외 반응을
                모아 아티스트와 이슈가 지금 얼마나 주목받는지 보여주는
                K-pop 시장 인텔리전스 플랫폼입니다.
              </p>
              <p className="mt-4 max-w-3xl rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-900">
                FANDEX 가격은 실제 주식 가격이 아니라 mock 데이터 기반의
                simulated index입니다. 투자 상품, 증권, 금융 조언이 아닙니다.
              </p>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <div className="rounded-3xl border border-cyan-200 bg-slate-50 p-5 shadow-sm">
                <p className="text-sm font-black text-cyan-700">
                  K-pop 종합지수
                </p>
                <p className="mt-2 font-mono text-5xl font-black text-slate-950">
                  {formatNumber(latestMarket.indexValue)}
                </p>
                <p className="mt-2 font-mono text-sm font-black text-red-300">
                  {formatPercent(latestMarket.changeRate)} 오늘
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
                  순위 보기
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                  Composite Index
                </p>
                <h2 className="mt-2 text-2xl font-black">K-pop 종합지수 차트</h2>
                <p className="mt-1 text-sm text-slate-500">
                  기간 {periodLabel} · mock intraday history
                </p>
              </div>
              <span className="w-fit rounded-full bg-cyan-50 px-3 py-1 text-xs font-black text-cyan-700">
                Simulated
              </span>
            </div>

            <FandexLineChart
              ariaLabel="K-pop composite index line chart"
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
                  label: 'K-pop Composite',
                  points: marketChartPoints.map((point) => ({
                    label: point.time,
                    value: point.value,
                  })),
                },
              ]}
            />

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SnapshotCard
                label="현재값"
                value={formatNumber(latestMarket.indexValue)}
                detail={formatPercent(latestMarket.changeRate)}
              />
              <SnapshotCard
                label="고가"
                value={formatNumber(highValue)}
                detail="표시 기간 기준"
              />
              <SnapshotCard
                label="저가"
                value={formatNumber(lowValue)}
                detail="표시 기간 기준"
              />
              <SnapshotCard
                label="관심량"
                value={formatLargeNumber(latestMarket.totalVolume)}
                detail="시장 전체 활동"
              />
            </div>
          </div>
        </section>

        <MarketIssueClimateSection climate={marketIssueClimate} />

        <section className="rounded-3xl border-2 border-cyan-200 bg-white p-6 shadow-lg shadow-cyan-100/60">
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
                시장 신호 예시
              </p>
              <h2 className="mt-2 text-3xl font-black">
                실시간 이슈 TOP 10
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                예시 이슈를 기준으로 FANDEX 시장 신호가 어떻게 보일지
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
                    value={formatPercent(leadingIssue.searchGrowthRate)}
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
                  시장 신호 더 보기
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
            FANDEX Early Access
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
            K-pop and entertainment issues, verified for marketing context
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            FANDEX is a research platform that verifies the latest K-pop and
            entertainment industry issues with public signal data, then
            interprets them from a marketing perspective.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            FANDEX Signal content published on Instagram, X, and LinkedIn can
            bring readers back to the website for source context, free previews,
            sample reports, and Early Access subscriber research.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/search"
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800"
            >
              Search Artist Preview
            </Link>
            <a
              href="#waitlist-form"
              className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
            >
              Request Early Access
            </a>
            <Link
              href="/sample-report"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
            >
              View Sample Report
            </Link>
            <a
              href="#waitlist-form"
              className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700 shadow-sm hover:bg-cyan-100"
            >
              Join FANDEX Beta
            </a>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <EarlyAccessCard
            eyebrow="Free Preview"
            title="What visitors can try first"
            items={publicPreviewItems}
          />
          <EarlyAccessCard
            eyebrow="Subscriber Research"
            title="Coming soon for Early Access subscribers"
            items={earlyAccessReportItems}
          />
        </div>
      </div>

      <section className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div className="mb-5">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
            From social signal to deeper research
          </p>
          <h3 className="mt-2 text-2xl font-black text-slate-950">
            How FANDEX turns SNS attention into research demand
          </h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {snsResearchFunnelSteps.map((step, index) => (
            <article
              key={step.title}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 font-mono text-sm font-black text-white">
                {index + 1}
              </span>
              <h4 className="mt-4 text-sm font-black text-slate-950">
                {step.title}
              </h4>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {step.copy}
              </p>
            </article>
          ))}
        </div>
      </section>

      <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs font-bold leading-6 text-slate-500">
        FANDEX is an experimental entertainment research index. It is not
        financial advice or an investment product. Scores may change as signal
        logic and data coverage improve.
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
  items: string[];
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
            key={item}
            className="rounded-xl border border-white bg-white px-3 py-2 text-sm font-bold text-slate-600 shadow-sm"
          >
            {item}
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
            Market issue climate
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-black">News & issue climate</h2>
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
