import Link from 'next/link';
import { notFound } from 'next/navigation';
import FandexLineChart from '../../components/FandexLineChart';
import ArtistNewsSection from '../../components/v3/ArtistNewsSection';
import CustomIndexBuilder from '../../components/v3/CustomIndexBuilder';
import {
  artistUniverse,
  getArtistV3ById,
} from '../../data/v3/artistUniverse';
import {
  factorDefinitionsV3,
  getArtistChartPoints,
  getArtistPriceHistory,
  getNewsByArtistId,
  trendingIssues,
} from '../../data/v3/mockData';

type PageProps = {
  params: Promise<{
    artistId: string;
  }>;
};

type MarketSignal = 'Rising' | 'Cooling' | 'Stable' | 'Watchlist';

export function generateStaticParams() {
  return artistUniverse.map((artist) => ({
    artistId: artist.id,
  }));
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function getMarketSignal(changeRate: number, volume: number): MarketSignal {
  if (changeRate >= 10) {
    return 'Rising';
  }

  if (changeRate <= -5) {
    return 'Cooling';
  }

  if (volume >= 30000) {
    return 'Watchlist';
  }

  return 'Stable';
}

function getCompareGroup(artistId: string) {
  return Array.from(new Set([artistId, 'aespa', 'ive', 'riize']))
    .slice(0, 4)
    .join(',');
}

export default async function ArtistDetailPage({ params }: PageProps) {
  const { artistId } = await params;
  const artist = getArtistV3ById(artistId);

  if (!artist) {
    notFound();
  }

  const priceHistory = getArtistPriceHistory(artistId);
  const chartPoints = getArtistChartPoints(artistId);
  const newsItems = getNewsByArtistId(artistId).slice(0, 6);
  const latestPrice = priceHistory[priceHistory.length - 1];
  const firstPrice = priceHistory[0];

  if (!latestPrice || !firstPrice) {
    notFound();
  }

  const priceChange = latestPrice.price - firstPrice.price;
  const priceChangeRate = (priceChange / firstPrice.price) * 100;
  const isUp = priceChange >= 0;
  const marketSignal = getMarketSignal(priceChangeRate, latestPrice.volume);
  const periodLabel = `${priceHistory[0]?.time ?? '-'} - ${
    priceHistory[priceHistory.length - 1]?.time ?? '-'
  }`;
  const factorRows = factorDefinitionsV3
    .map((factor) => ({
      key: factor.key,
      label: factor.label,
      score: latestPrice.scores[factor.key],
      helpText: factor.helpText,
    }))
    .sort((a, b) => b.score - a.score);
  const strongestFactor = factorRows[0];
  const weakestFactor = factorRows[factorRows.length - 1];
  const relatedIssues = trendingIssues
    .filter((issue) => issue.relatedArtistIds.includes(artist.id))
    .slice(0, 4);
  const issuesToShow =
    relatedIssues.length > 0 ? relatedIssues : trendingIssues.slice(0, 3);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#070A12] dark:text-white">
      <section className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="font-mono text-sm font-black text-cyan-600 dark:text-cyan-300">
                {artist.ticker}
              </p>
              <h1 className="mt-3 text-5xl font-black tracking-tight">
                {artist.nameEn}
              </h1>
              <p className="mt-3 text-lg font-bold text-slate-500 dark:text-slate-400">
                {artist.agency} / {artist.type} / {artist.generation}
              </p>
              <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {artist.shortIntro}
              </p>
              <p className="mt-5 max-w-3xl rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-bold leading-6 text-cyan-800 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-100">
                FANDEX price is an internal simulated artist market index. It
                is not a real stock, security, investment product, or financial
                advice.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <IntroFact label="Debut" value={artist.debutDate} />
                <IntroFact label="Fandom" value={artist.fandomName ?? 'TBD'} />
                <IntroFact
                  label="Members"
                  value={`${artist.members.length} tracked`}
                />
                <IntroFact
                  label="Markets"
                  value={artist.countryFocus.slice(0, 3).join(', ')}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {artist.keywords.slice(0, 6).map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                  >
                    #{keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/"
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-cyan-300"
              >
                Back to market home
              </Link>
              <Link
                href={`/compare?artists=${artist.id}`}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-300 dark:hover:text-cyan-300"
              >
                Compare this artist
              </Link>
              <Link
                href={`/compare?artists=${getCompareGroup(artist.id)}`}
                className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-black text-slate-950 hover:bg-cyan-300"
              >
                Compare with representatives
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MarketStat
            label="Current FANDEX price"
            value={`${latestPrice.price.toFixed(2)} FDX`}
            tone="black"
          />
          <MarketStat
            label="Change rate"
            value={formatPercent(priceChangeRate)}
            tone={isUp ? 'red' : 'blue'}
          />
          <MarketStat
            label="Volume"
            value={formatLargeNumber(latestPrice.volume)}
            tone="purple"
          />
          <MarketStat
            label="Fan size value"
            value={formatLargeNumber(latestPrice.fanSizeValue)}
            tone="cyan"
          />
          <MarketStat
            label="Market signal"
            value={marketSignal}
            tone={marketSignal === 'Cooling' ? 'blue' : 'cyan'}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5">
              <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300">
                Official FANDEX price
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {artist.nameEn} official artist index
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                The official FANDEX price blends music, album, video, SNS,
                search, news, global, fandom, and company signals into one
                simulated artist market index.
              </p>
            </div>

            <FandexLineChart
              ariaLabel={`${artist.nameEn} official FANDEX price line chart`}
              period={periodLabel}
              height={360}
              minWidth={720}
              showArea
              valueLocale="en-US"
              minimumFractionDigits={2}
              maximumFractionDigits={2}
              changeFractionDigits={2}
              series={[
                {
                  id: `${artist.id}-official-price`,
                  label: `${artist.ticker} Official FANDEX`,
                  points: chartPoints.map((point) => ({
                    label: point.time,
                    value: point.value,
                  })),
                },
              ]}
            />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5">
              <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300">
                Factor breakdown
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                Strengths and weak spots
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                Latest factor scores explain which signals are carrying the
                current artist index.
              </p>
            </div>

            {strongestFactor && weakestFactor && (
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                <FactorHighlight
                  label="Top strength"
                  factor={strongestFactor.label}
                  score={strongestFactor.score}
                />
                <FactorHighlight
                  label="Weakest factor"
                  factor={weakestFactor.label}
                  score={weakestFactor.score}
                />
              </div>
            )}

            <div className="space-y-3">
              {factorRows.map((factor) => (
                <FactorBar
                  key={factor.key}
                  label={factor.label}
                  score={factor.score}
                  helpText={factor.helpText}
                />
              ))}
            </div>
          </section>
        </section>

        <CustomIndexBuilder
          artistName={artist.nameEn}
          priceHistory={priceHistory}
        />

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300">
              Related issue impact
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              Issues that may have influenced signals
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              These issue cards are cautious market context. They may have
              influenced attention, search, social reaction, or FANDEX momentum.
            </p>

            <div className="mt-5 space-y-3">
              {issuesToShow.map((issue) => (
                <article
                  key={issue.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-black text-cyan-700 dark:bg-cyan-400 dark:text-slate-950">
                      #{issue.rank}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                      {issue.category}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                      {issue.impact}
                    </span>
                  </div>
                  <h3 className="mt-3 font-black text-slate-950 dark:text-white">
                    {issue.headline}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {issue.summary} This appears related to signal movement and
                    is a watch item for future content planning.
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300">
              AI content angle preview
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              Data-to-content ideas
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              Planned AI studio output based on this artist data. No external
              AI API or upload workflow is called here.
            </p>

            <div className="mt-5 grid gap-3">
              <ContentIdea
                label="Short-form hook"
                value={`Why ${artist.nameEn}'s ${strongestFactor?.label ?? 'top'} signal is moving faster than the market.`}
              />
              <ContentIdea
                label="Feed post angle"
                value={`Break down ${artist.ticker}'s FANDEX price, volume, and fan size value in one carousel.`}
              />
              <ContentIdea
                label="Thread/X post angle"
                value={`A quick thread on what ${marketSignal.toLowerCase()} means for ${artist.nameEn}'s simulated artist index.`}
              />
              <ContentIdea
                label="Fandom engagement idea"
                value={`Ask fans which signal matters most right now: ${strongestFactor?.label ?? 'momentum'}, issue impact, or content reaction.`}
              />
            </div>
          </section>
        </section>

        <ArtistNewsSection newsItems={newsItems} />
      </section>
    </main>
  );
}

function MarketStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'black' | 'red' | 'blue' | 'purple' | 'cyan';
}) {
  const toneClass = {
    black: 'text-slate-950 dark:text-white',
    red: 'text-red-500',
    blue: 'text-blue-500',
    purple: 'text-purple-500',
    cyan: 'text-cyan-600 dark:text-cyan-300',
  }[tone];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className={`mt-2 font-mono text-xl font-black ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function IntroFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
  );
}

function FactorHighlight({
  label,
  factor,
  score,
}: {
  label: string;
  factor: string;
  score: number;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
        {factor}
      </p>
      <p className="mt-1 font-mono text-sm font-black text-cyan-600 dark:text-cyan-300">
        {score.toFixed(1)}
      </p>
    </div>
  );
}

function FactorBar({
  label,
  score,
  helpText,
}: {
  label: string;
  score: number;
  helpText: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="font-black text-slate-600 dark:text-slate-300">
          {label}
        </span>
        <span className="font-mono font-black text-slate-950 dark:text-white">
          {score.toFixed(1)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-400"
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-400">{helpText}</p>
    </div>
  );
}

function ContentIdea({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {value}
      </p>
    </article>
  );
}
