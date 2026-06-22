import Link from 'next/link';

import ComparePriceChart from '../components/v3/ComparePriceChart';

import { artistUniverse, getArtistV3ById } from '../data/v3/artistUniverse';
import { getArtistV4ById } from '../data/v4/artistUniverse';
import { factorDefinitionsV3 } from '../data/v3/mockData';
import type { ChartPoint, FactorKey } from '../data/v3/types';
import {
  getArtistChartPointsV4,
  getArtistPriceHistoryV4,
  type ArtistPriceHistoryPointV4,
} from '../data/v4/artistPriceHistory';
import type { IssueScoreBreakdown } from '../data/v4/scoring/types';

const defaultArtistIds = ['aespa', 'ive', 'riize'];

type ComparePageProps = {
  searchParams?: Promise<{
    artists?: string | string[];
  }>;
};

type CompareArtistViewModel = {
  id: string;
  ticker: string;
  nameKo: string;
  nameEn: string;
};

type CompareHistoryPoint = {
  time: string;
  price: number;
};

type CompareRow = {
  artist: CompareArtistViewModel;
  history: CompareHistoryPoint[];
  latest: ArtistPriceHistoryPointV4;
  currentPrice: number;
  currentVolume: number;
  currentFanSizeValue: number;
  changeRate: number;
  isUp: boolean;
};
type IssueTone = 'positive' | 'neutral' | 'watch' | 'risk';
type CompareIssueSummary = {
  artist: CompareArtistViewModel;
  label: 'Positive' | 'Neutral' | 'Watch' | 'Risk';
  tone: IssueTone;
  issueScore: number;
  controversyRiskScore: number;
  confidenceScore: number;
  activeIssueCount: number;
  positiveIssueCount: number;
  negativeIssueCount: number;
};

const factorLabels: Record<string, string> = {
  music: 'Music',
  album: 'Album',
  youtube: 'YouTube',
  sns: 'SNS',
  search: 'Search',
  news: 'News',
  global: 'Global',
  fandom: 'Fandom',
  company: 'Company',
};

function formatPrice(value: number): string {
  return safePositiveNumber(value).toFixed(2);
}

function formatPercent(value: number): string {
  const safeValue = safeNumber(value);
  const sign = safeValue >= 0 ? '+' : '';

  return `${sign}${safeValue.toFixed(2)}%`;
}

function formatLargeNumber(value: number): string {
  const safeValue = safePositiveNumber(value);

  if (safeValue >= 1000000000) {
    return `${(safeValue / 1000000000).toFixed(1)}B`;
  }

  if (safeValue >= 1000000) {
    return `${(safeValue / 1000000).toFixed(1)}M`;
  }

  if (safeValue >= 1000) {
    return `${(safeValue / 1000).toFixed(1)}K`;
  }

  return String(safeValue);
}

function safeNumber(value: number | null | undefined, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safePositiveNumber(
  value: number | null | undefined,
  fallback = 0
): number {
  return Math.max(safeNumber(value, fallback), 0);
}

function clampScore(value: number | null | undefined, fallback = 0) {
  return Math.min(Math.max(safeNumber(value, fallback), 0), 100);
}

function getChangeRateFromHistory(firstPrice: number, latestPrice: number) {
  const safeFirstPrice = safeNumber(firstPrice);
  const safeLatestPrice = safeNumber(latestPrice);

  if (safeFirstPrice === 0) {
    return 0;
  }

  return ((safeLatestPrice - safeFirstPrice) / safeFirstPrice) * 100;
}

function toCompareHistory(chartPoints: ChartPoint[]): CompareHistoryPoint[] {
  return chartPoints
    .filter((point) => Number.isFinite(point.value))
    .map((point) => ({
      time: point.time,
      price: safePositiveNumber(point.value),
    }));
}

function getFactorScore(row: CompareRow, factorKey: FactorKey) {
  return safeNumber(row.latest.scores[factorKey]);
}

function getIssueTone({
  issueScore,
  controversyRiskScore,
  activeIssueCount,
  negativeIssueCount,
}: {
  issueScore: number;
  controversyRiskScore: number;
  activeIssueCount: number;
  negativeIssueCount: number;
}): Pick<CompareIssueSummary, 'label' | 'tone'> {
  if (controversyRiskScore >= 65) {
    return { label: 'Risk', tone: 'risk' };
  }

  if (
    issueScore <= 40 ||
    controversyRiskScore >= 35 ||
    (activeIssueCount > 0 && negativeIssueCount >= activeIssueCount)
  ) {
    return { label: 'Watch', tone: 'watch' };
  }

  if (issueScore >= 60 && controversyRiskScore < 50) {
    return { label: 'Positive', tone: 'positive' };
  }

  return { label: 'Neutral', tone: 'neutral' };
}

function getIssueSummary(row: CompareRow): CompareIssueSummary {
  const breakdown: IssueScoreBreakdown | undefined =
    row.latest.issueScoreBreakdown ??
    row.latest.scoreBreakdown.issueScoreBreakdown;
  const summary = row.latest.issueSignalsSummary;
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
  const tone = getIssueTone({
    issueScore,
    controversyRiskScore,
    activeIssueCount,
    negativeIssueCount,
  });

  return {
    artist: row.artist,
    ...tone,
    issueScore,
    controversyRiskScore,
    confidenceScore,
    activeIssueCount,
    positiveIssueCount,
    negativeIssueCount,
  };
}

function getIssueComparisonCopy(summaries: CompareIssueSummary[]) {
  if (summaries.length === 0) {
    return 'Issue signals are currently balanced.';
  }

  const highestRisk = getLeader(
    summaries,
    (summary) => summary.controversyRiskScore
  );
  const strongestIssue = getLeader(summaries, (summary) => summary.issueScore);
  const lowestConfidence = summaries.reduce((lowest, summary) =>
    summary.confidenceScore < lowest.confidenceScore ? summary : lowest
  );
  const riskGap =
    highestRisk && summaries.length > 1
      ? highestRisk.controversyRiskScore -
        Math.min(...summaries.map((summary) => summary.controversyRiskScore))
      : 0;
  const issueGap =
    strongestIssue && summaries.length > 1
      ? strongestIssue.issueScore -
        Math.min(...summaries.map((summary) => summary.issueScore))
      : 0;

  if (riskGap >= 15 && highestRisk) {
    return `${highestRisk.artist.nameEn} currently carries higher watch risk in issue signals.`;
  }

  if (issueGap >= 10 && strongestIssue) {
    return `${strongestIssue.artist.nameEn} has stronger positive issue momentum.`;
  }

  if (lowestConfidence.confidenceScore < 45) {
    return `${lowestConfidence.artist.nameEn} has lower issue confidence, so compare signals conservatively.`;
  }

  return 'Issue signals are currently balanced across the selected artists.';
}

function createCompareHref(ids: string[]): string {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean).slice(0, 4);
  return `/compare?artists=${uniqueIds.join(',')}`;
}

function getCompareArtistViewModel(
  artistId: string
): CompareArtistViewModel | undefined {
  const artistV3 = getArtistV3ById(artistId);

  if (artistV3) {
    return {
      id: artistV3.id,
      ticker: artistV3.ticker,
      nameKo: artistV3.nameKo,
      nameEn: artistV3.nameEn,
    };
  }

  const artistV4 = getArtistV4ById(artistId);

  if (!artistV4) {
    return undefined;
  }

  return {
    id: artistV4.id,
    ticker: artistV4.ticker,
    nameKo: artistV4.nameKo,
    nameEn: artistV4.nameEn,
  };
}

function getLeader<T>(rows: T[], selectValue: (row: T) => number): T | null {
  if (rows.length === 0) {
    return null;
  }

  return rows.reduce((best, row) =>
    selectValue(row) > selectValue(best) ? row : best
  );
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const params = (await searchParams) ?? {};
  const rawArtists = params.artists;
  const artistParam = Array.isArray(rawArtists) ? rawArtists[0] : rawArtists;

  const requestedIds =
    typeof artistParam === 'string'
      ? artistParam
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean)
      : [];

  const selectedIds = Array.from(
    new Set(requestedIds.length > 0 ? requestedIds : defaultArtistIds)
  ).slice(0, 4);

  const compareRows: CompareRow[] = selectedIds
    .map((id) => {
      const artist = getCompareArtistViewModel(id);

      if (!artist) {
        return null;
      }

      const priceHistory = getArtistPriceHistoryV4(artist.id);
      const chartHistory = toCompareHistory(getArtistChartPointsV4(artist.id));
      const first = priceHistory[0];
      const latest = priceHistory[priceHistory.length - 1];

      if (!first || !latest || chartHistory.length === 0) {
        return null;
      }

      const currentPrice = safePositiveNumber(latest.price);
      const currentVolume = safePositiveNumber(latest.volume);
      const currentFanSizeValue = safePositiveNumber(latest.fanSizeValue);
      const changeRate = getChangeRateFromHistory(first.price, currentPrice);

      return {
        artist,
        history: chartHistory,
        latest,
        currentPrice,
        currentVolume,
        currentFanSizeValue,
        changeRate,
        isUp: changeRate >= 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const insightCards = [
    {
      label: 'Top price',
      row: getLeader(compareRows, (row) => row.currentPrice),
      value: (row: CompareRow) => formatPrice(row.currentPrice),
      note: 'Highest current FANDEX price',
    },
    {
      label: 'Top change',
      row: getLeader(compareRows, (row) => row.changeRate),
      value: (row: CompareRow) => formatPercent(row.changeRate),
      note: 'Strongest session momentum',
    },
    {
      label: 'Top volume',
      row: getLeader(compareRows, (row) => row.currentVolume),
      value: (row: CompareRow) => formatLargeNumber(row.currentVolume),
      note: 'Largest activity volume',
    },
    {
      label: 'Top fan size',
      row: getLeader(compareRows, (row) => row.currentFanSizeValue),
      value: (row: CompareRow) => formatLargeNumber(row.currentFanSizeValue),
      note: 'Largest simulated fan value',
    },
  ];
  const issueSummaries = compareRows.map(getIssueSummary);
  const issueComparisonCopy = getIssueComparisonCopy(issueSummaries);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 px-6 py-10 text-slate-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header>
          <div className="mb-4 flex gap-3">
            <Link
              href="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm"
            >
              Market home
            </Link>

            <Link
              href="/ranking"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm"
            >
              Ranking
            </Link>
          </div>

          <p className="text-sm font-black text-cyan-300">FANDEX COMPARE</p>
          <h1 className="mt-2 text-4xl font-black">
            Compare K-pop artist market signals
          </h1>
          <p className="mt-4 max-w-3xl text-sm text-slate-500">
            Compare selected artists by FANDEX price, artist index momentum,
            activity volume, fan size value, and factor scores. This MVP uses
            internal simulated market data, not real securities or financial
            advice.
          </p>
        </header>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {insightCards.map((card) => (
            <InsightCard
              key={card.label}
              label={card.label}
              ticker={card.row?.artist.ticker ?? '-'}
              value={card.row ? card.value(card.row) : '-'}
              note={card.note}
            />
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-3">
          {compareRows.map((row) => (
            <article
              key={row.artist.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <p className="text-xs font-black text-cyan-600">
                {row.artist.ticker}
              </p>

              <h2 className="mt-1 text-2xl font-black">{row.artist.nameEn}</h2>

              <p className="mt-1 text-xs font-bold text-slate-500">
                Artist market signal
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <MiniStat
                  label="Current price"
                  value={formatPrice(row.currentPrice)}
                />
                <MiniStat
                  label="Change rate"
                  value={formatPercent(row.changeRate)}
                />
                <MiniStat
                  label="Volume"
                  value={formatLargeNumber(row.currentVolume)}
                />
                <MiniStat
                  label="Fan size"
                  value={formatLargeNumber(row.currentFanSizeValue)}
                />
              </div>
            </article>
          ))}
        </section>

        <ComparePriceChart rows={compareRows} />

        <IssueComparisonSection
          summaries={issueSummaries}
          comparisonCopy={issueComparisonCopy}
        />

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black text-cyan-600">FACTOR SCORE</p>
            <h2 className="mt-2 text-2xl font-black">
              Factor score comparison
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Compare selected artists by FANDEX factor scores and identify the
              current leader for each market signal.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {factorDefinitionsV3.map((factor) => {
              const leader = getLeader(
                compareRows,
                (row) => getFactorScore(row, factor.key)
              );

              return (
                <article
                  key={factor.key}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-black">
                        {factorLabels[factor.key] ?? factor.key}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        FANDEX factor score
                      </p>
                    </div>

                    {leader && (
                      <span className="rounded-full bg-cyan-500 px-3 py-1 text-xs font-black text-white">
                        Leader {leader.artist.ticker}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 space-y-3">
                    {compareRows.map((row) => {
                      const score = getFactorScore(row, factor.key);

                      return (
                        <div key={`${factor.key}-${row.artist.id}`}>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-500">
                              {row.artist.ticker}
                            </span>
                            <span className="font-black">
                              {score.toFixed(1)}
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-cyan-500"
                              style={{
                                width: `${Math.min(score, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-black text-cyan-600">ARTIST SELECTOR</p>
            <h2 className="mt-2 text-2xl font-black">Select artists</h2>
            <p className="mt-2 text-sm text-slate-500">
              Select up to four artists. The comparison is saved in the URL as
              /compare?artists=aespa,ive,riize.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {artistUniverse.map((artist) => {
              const isSelected = selectedIds.includes(artist.id);
              const isDisabled = !isSelected && selectedIds.length >= 4;

              const nextIds = isSelected
                ? selectedIds.filter((id) => id !== artist.id)
                : [...selectedIds, artist.id];

              const safeNextIds =
                nextIds.length > 0 ? nextIds.slice(0, 4) : defaultArtistIds;

              return (
                <Link
                  key={artist.id}
                  href={
                    isDisabled
                      ? createCompareHref(selectedIds)
                      : createCompareHref(safeNextIds)
                  }
                  aria-disabled={isDisabled}
                  className={`rounded-2xl border p-4 transition ${
                    isSelected
                      ? 'border-cyan-300 bg-cyan-500 text-white'
                      : isDisabled
                        ? 'pointer-events-none border-slate-200 bg-slate-50 text-slate-600'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-cyan-300 hover:text-cyan-600'
                  }`}
                >
                  <span className="block text-xs font-black">
                    {artist.ticker}
                  </span>
                  <span className="mt-2 block text-sm font-black">
                    {artist.nameEn}
                  </span>
                  <span className="mt-2 block text-xs font-bold opacity-70">
                    {isSelected
                      ? 'Selected'
                      : isDisabled
                        ? 'Limit reached'
                        : 'Add to compare'}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}

function InsightCard({
  label,
  ticker,
  value,
  note,
}: {
  label: string;
  ticker: string;
  value: string;
  note: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black text-cyan-600">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-2xl font-black">{ticker}</p>
        <p className="text-lg font-black text-slate-950">{value}</p>
      </div>
      <p className="mt-3 text-xs font-bold text-slate-500">{note}</p>
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function IssueComparisonSection({
  summaries,
  comparisonCopy,
}: {
  summaries: CompareIssueSummary[];
  comparisonCopy: string;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <p className="text-xs font-black text-cyan-600">
          NEWS & ISSUE COMPARISON
        </p>
        <h2 className="mt-2 text-2xl font-black">
          Issue signal comparison
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {comparisonCopy}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaries.map((summary) => (
          <article
            key={summary.artist.id}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black text-cyan-600">
                  {summary.artist.ticker}
                </p>
                <h3 className="mt-1 font-black text-slate-950">
                  {summary.artist.nameEn}
                </h3>
              </div>
              <IssueToneBadge label={summary.label} tone={summary.tone} />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <IssueMiniStat
                label="Issue"
                value={Math.round(summary.issueScore)}
              />
              <IssueMiniStat
                label="Risk"
                value={Math.round(summary.controversyRiskScore)}
              />
              <IssueMiniStat
                label="Conf."
                value={Math.round(summary.confidenceScore)}
              />
            </div>

            <p className="mt-3 text-xs font-bold text-slate-500">
              {summary.activeIssueCount} signals / {summary.positiveIssueCount}
              positive / {summary.negativeIssueCount} watch
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function IssueToneBadge({
  label,
  tone,
}: {
  label: CompareIssueSummary['label'];
  tone: IssueTone;
}) {
  const toneClass = {
    positive: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    neutral: 'border-slate-200 bg-white text-slate-600',
    watch: 'border-purple-200 bg-purple-50 text-purple-700',
    risk: 'border-blue-200 bg-blue-50 text-blue-700',
  }[tone];

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${toneClass}`}
    >
      {label}
    </span>
  );
}

function IssueMiniStat({ label, value }: { label: string; value: number }) {
  const safeValue = Math.round(clampScore(value));

  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="text-[11px] font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-sm font-black text-slate-950">
        {safeValue}
      </p>
    </div>
  );
}
