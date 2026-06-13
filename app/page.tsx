import Link from 'next/link';
import {
  getLatestMarketPoint,
  marketChartPoints,
  trendingIssues,
} from './data/v3/mockData';
import { getArtistRankingRows } from './data/v3/artistRanking';

export default function Home() {
  const latestMarket = getLatestMarketPoint();
  const artistRankings = getArtistRankingRows();
  const topMover = [...artistRankings].sort(
    (a, b) => b.changeRate - a.changeRate
  )[0];
  const mostActive = [...artistRankings].sort((a, b) => b.volume - a.volume)[0];
  const featuredArtists = artistRankings.slice(0, 4);
  const leadingIssue = trendingIssues[0];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-stretch">
          <div className="flex min-h-[420px] flex-col justify-between rounded-3xl border border-slate-800 bg-slate-900 p-7 shadow-2xl shadow-slate-950/40">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
                FANDEX Market Intelligence
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                K-pop artist signals, issue impact, and AI-ready content angles.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
                FANDEX turns simulated artist index movement, attention volume,
                issue data, fandom reaction, search demand, and social signals
                into a dashboard for timing, comparison, and content planning.
              </p>
              <p className="mt-4 max-w-3xl rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm font-bold leading-6 text-cyan-100">
                FANDEX price is an internal simulated artist market index. It
                is not a real stock, security, investment product, or financial
                advice.
              </p>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/compare?artists=aespa,ive,riize"
                className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-200"
              >
                Compare artists
              </Link>
              <Link
                href="/ranking"
                className="rounded-full border border-slate-700 px-5 py-3 text-sm font-black text-slate-200 hover:border-cyan-300 hover:text-cyan-300"
              >
                View ranking
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Market pulse</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Intraday FANDEX index movement
                </p>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-cyan-300">
                Simulated
              </span>
            </div>

            <MarketLineChart />

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <SnapshotCard
                label="Market index"
                value={latestMarket.indexValue.toLocaleString()}
                detail={`+${latestMarket.changeRate}% today`}
              />
              <SnapshotCard
                label="Attention volume"
                value={formatLargeNumber(latestMarket.totalVolume)}
                detail="Market-wide activity"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SnapshotCard
            label="Top mover"
            value={topMover?.ticker ?? '-'}
            detail={`${formatPercent(topMover?.changeRate ?? 0)} FANDEX price`}
          />
          <SnapshotCard
            label="Most active artist"
            value={mostActive?.ticker ?? '-'}
            detail={`${formatLargeNumber(mostActive?.volume ?? 0)} attention volume`}
          />
          <SnapshotCard
            label="Issue-driven momentum"
            value={leadingIssue ? `#${leadingIssue.rank}` : '-'}
            detail={leadingIssue?.headline ?? 'No active issue'}
          />
          <SnapshotCard
            label="Rising artists"
            value={`${latestMarket.risingArtistCount}`}
            detail={`${latestMarket.fallingArtistCount} cooling signals`}
          />
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Product pillars
            </p>
            <h2 className="mt-2 text-2xl font-black">What FANDEX does</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <PillarCard
              title="Artist market signals"
              status="Live"
              description="Compare FANDEX price, momentum, activity volume, and relative signal strength across K-pop artists."
              href="/compare?artists=aespa,ive,riize"
              action="Open compare"
            />
            <PillarCard
              title="Issue impact analysis"
              status="In progress"
              description="Track how issues may affect FANDEX price movement, search demand, social reaction, news exposure, and market momentum."
              href="/signals"
              action="View signals"
            />
            <PillarCard
              title="Creator tools planned"
              status="Planned"
              description="Private SNS planning and AI draft workflows are being kept separate from the public market product."
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
                Featured artists
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Start with the current market leaders
              </h2>
            </div>
            <Link
              href="/ranking"
              className="w-fit rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-300 hover:border-cyan-300 hover:text-cyan-300"
            >
              Full ranking
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {featuredArtists.map((artist) => (
              <Link
                key={artist.id}
                href={`/artists/${artist.id}`}
                className="rounded-2xl border border-slate-800 bg-slate-950 p-5 transition hover:border-cyan-300"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-cyan-300">
                      {artist.ticker}
                    </p>
                    <h3 className="mt-2 text-xl font-black">
                      {artist.nameEn}
                    </h3>
                  </div>
                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black text-slate-400">
                    #{artist.rank}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <MiniMetric label="Price" value={artist.price.toFixed(2)} />
                  <MiniMetric
                    label="Change"
                    value={formatPercent(artist.changeRate)}
                  />
                  <MiniMetric
                    label="Volume"
                    value={formatLargeNumber(artist.volume)}
                  />
                  <MiniMetric label="Type" value={artist.category} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Recent issues
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Market signals move when issues spread
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              FANDEX connects each issue to before-and-after movement across
              price, attention, fandom, search, social, news, and momentum
              signals.
            </p>
            <Link
              href="/signals"
              className="mt-5 inline-flex rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-300 hover:border-cyan-300 hover:text-cyan-300"
            >
              Explore issue signals
            </Link>
          </div>

          <div className="space-y-3">
            {trendingIssues.slice(0, 4).map((issue) => (
              <article
                key={issue.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cyan-300 px-2.5 py-1 text-xs font-black text-slate-950">
                    #{issue.rank}
                  </span>
                  <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-400">
                    {issue.category}
                  </span>
                  <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-400">
                    {issue.impact}
                  </span>
                </div>
                <h3 className="mt-3 font-black">{issue.headline}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {issue.summary}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                Next action
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Compare aespa, IVE, and RIIZE first.
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-cyan-100">
                Use the compare page to see price movement, factor leaders,
                low-point context, and momentum differences in one view.
              </p>
            </div>

            <Link
              href="/compare?artists=aespa,ive,riize"
              className="w-fit rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-200"
            >
              Launch compare
            </Link>
          </div>
        </section>
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
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="h-[260px] min-w-[640px] w-full"
        role="img"
        aria-label="K-pop market index line chart"
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
    <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-slate-500">
        {detail}
      </p>
    </article>
  );
}

function PillarCard({
  title,
  status,
  description,
  href,
  action,
}: {
  title: string;
  status: 'Live' | 'In progress' | 'Planned';
  description: string;
  href?: string;
  action?: string;
}) {
  const statusClass = {
    Live: 'bg-emerald-400/10 text-emerald-300',
    'In progress': 'bg-cyan-400/10 text-cyan-300',
    Planned: 'bg-slate-800 text-slate-300',
  }[status];

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-xl font-black">{title}</h3>
        <span className={`rounded-full px-3 py-1 text-xs font-black ${statusClass}`}>
          {status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-400">{description}</p>
      {href && action && (
        <Link
          href={href}
          className="mt-5 inline-flex rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-300 hover:border-cyan-300 hover:text-cyan-300"
        >
          {action}
        </Link>
      )}
    </article>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-900 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}
