import Link from 'next/link';
import {
  factorDefinitionsV3,
  getLatestMarketPoint,
  marketChartPoints,
  trendingIssues,
} from './data/v3/mockData';

import { getArtistRankingRows } from './data/v3/artistRanking';
import ArtistRankingTable from './data/v3/ArtistRankingTable';

export default function Home() {
  const latestMarket = getLatestMarketPoint();
  const artistRankings = getArtistRankingRows();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-cyan-400">FANDEX v3</p>

            <h1 className="text-3xl font-bold tracking-tight">
              K-pop market intelligence dashboard
            </h1>

            <p className="max-w-2xl text-sm text-slate-400">
              FANDEX combines simulated artist index data, issue signals,
              search demand, social reaction, news exposure, and fandom
              momentum into one market view.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/compare"
              className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-cyan-400"
            >
              Compare artists
            </Link>

            <Link
              href="/ranking"
              className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
            >
              View ranking
            </Link>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard label="Market index" value={latestMarket.indexValue.toLocaleString()} />
          <MetricCard
            label="Index change"
            value={`+${latestMarket.changeRate}%`}
            valueClassName="text-emerald-400"
          />
          <MetricCard label="Attention volume" value={latestMarket.totalVolume.toLocaleString()} />
          <MetricCard label="Rising artists" value={`${latestMarket.risingArtistCount}`} />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">K-pop market index</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Intraday FANDEX market index movement
                </p>
              </div>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
                Line Chart
              </span>
            </div>

            {(() => {
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
                  padding +
                  (index / Math.max(marketChartPoints.length - 1, 1)) *
                    plotWidth;
                const y =
                  padding +
                  ((maxValue - point.value) / valueRange) * plotHeight;

                return { ...point, x, y };
              });

              const linePoints = chartPoints
                .map((point) => `${point.x},${point.y}`)
                .join(' ');
              const areaPoints = [
                `${chartPoints[0].x},${chartHeight - padding}`,
                linePoints,
                `${chartPoints[chartPoints.length - 1].x},${chartHeight - padding}`,
              ].join(' ');
              const yGuideValues = [
                maxValue,
                minValue + valueRange * 0.5,
                minValue,
              ];

              return (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="h-[260px] w-full"
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
                      const y =
                        padding + ((maxValue - value) / valueRange) * plotHeight;

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
                        <text
                          x={point.x}
                          y={point.y - 12}
                          textAnchor="middle"
                          className="fill-cyan-300 text-[11px] font-semibold"
                        >
                          {point.value}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              );
            })()}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Key issues TOP 5</h2>
              <span className="text-xs text-slate-500">Live issue signals</span>
            </div>

            <div className="space-y-3">
              {trendingIssues.slice(0, 5).map((issue) => (
                <article
                  key={issue.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-xs font-bold text-slate-950">
                      #{issue.rank}
                    </span>
                    <span className="text-xs text-slate-400">
                      {issue.category}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold">{issue.headline}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    {issue.summary}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <ArtistRankingTable artists={artistRankings} />

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">FANDEX factor model</h2>
            <span className="text-xs text-slate-500">Default weights</span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {factorDefinitionsV3.map((factor) => (
              <div
                key={factor.key}
                className="rounded-xl border border-slate-800 bg-slate-950 p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{factor.label}</h3>
                  <span className="text-sm font-bold text-cyan-400">
                    {factor.defaultWeight}%
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  {factor.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function MetricCard({
  label,
  value,
  valueClassName = '',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueClassName}`}>{value}</p>
    </div>
  );
}
