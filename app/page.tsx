import Link from 'next/link';
import FandexLineChart from './components/FandexLineChart';
import ArtistSearch from './components/v3/ArtistSearch';
import { artistUniverse, getArtistV3ById } from './data/v3/artistUniverse';
import {
  getLatestMarketPoint,
  marketChartPoints,
  trendingIssues,
} from './data/v3/mockData';
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

export default function Home() {
  const latestMarket = getLatestMarketPoint();
  const values = marketChartPoints.map((point) => point.value);
  const highValue = Math.max(...values);
  const lowValue = Math.min(...values);
  const periodLabel = `${marketChartPoints[0]?.time ?? '-'} - ${
    marketChartPoints[marketChartPoints.length - 1]?.time ?? '-'
  }`;
  const leadingIssue = trendingIssues[0];
  const issueRows = getHomepageIssueRows();

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
      </section>
    </main>
  );
}

function MarketLineChart() {
  const chartWidth = 720;
  const chartHeight = 260;
  const padding = 36;
  const values = marketChartPoints.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const valueRange = maxValue - minValue || 1;
  const plotWidth = chartWidth - padding * 2;
  const plotHeight = chartHeight - padding * 2;

  const chartPoints = marketChartPoints.map((point, index) => {
    const x =
      padding + (index / Math.max(marketChartPoints.length - 1, 1)) * plotWidth;
    const y = padding + ((maxValue - point.value) / valueRange) * plotHeight;

    return { ...point, x, y };
  });

  const linePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPoints = [
    `${chartPoints[0].x},${chartHeight - padding}`,
    linePoints,
    `${chartPoints[chartPoints.length - 1].x},${chartHeight - padding}`,
  ].join(' ');
  const yGuideValues = [maxValue, minValue + valueRange * 0.5, minValue];

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="h-[260px] min-w-[640px] w-full"
        role="img"
        aria-label="K-pop 종합지수 라인 차트"
      >
        <defs>
          <linearGradient id="marketIndexArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yGuideValues.map((value) => {
          const y = padding + ((maxValue - value) / valueRange) * plotHeight;

          return (
            <g key={value}>
              <line
                x1={padding}
                x2={chartWidth - padding}
                y1={y}
                y2={y}
                stroke="#1e293b"
                strokeDasharray="4 4"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[10px]"
              >
                {Math.round(value)}
              </text>
            </g>
          );
        })}

        <polygon points={areaPoints} fill="url(#marketIndexArea)" />
        <polyline
          points={linePoints}
          fill="none"
          stroke="#22d3ee"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {chartPoints.map((point) => (
          <g key={point.time}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#020617"
              stroke="#22d3ee"
              strokeWidth="3"
            />
            <text
              x={point.x}
              y={chartHeight - 10}
              textAnchor="middle"
              className="fill-slate-400 text-[11px]"
            >
              {point.time}
            </text>
          </g>
        ))}
      </svg>
    </div>
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
