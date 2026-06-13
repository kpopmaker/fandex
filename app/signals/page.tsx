import Link from 'next/link';
import { getArtistV3ById } from '../data/v3/artistUniverse';
import { getArtistPriceHistory, trendingIssues } from '../data/v3/mockData';
import type { KpopIssue } from '../data/v3/types';

type ImpactDirection = 'Positive' | 'Negative' | 'Mixed' | 'Watch';

function formatPrice(value: number) {
  return value.toFixed(2);
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

function getImpactDirection(issue: KpopIssue): ImpactDirection {
  if (issue.impact.toLowerCase().includes('down')) {
    return 'Negative';
  }

  if (issue.impact.toLowerCase().includes('limited')) {
    return 'Watch';
  }

  if (issue.relatedArtistIds.length > 2) {
    return 'Mixed';
  }

  return 'Positive';
}

function getDirectionClass(direction: ImpactDirection) {
  const classes: Record<ImpactDirection, string> = {
    Positive: 'bg-emerald-400/10 text-emerald-300',
    Negative: 'bg-blue-400/10 text-blue-300',
    Mixed: 'bg-cyan-400/10 text-cyan-300',
    Watch: 'bg-slate-800 text-slate-300',
  };

  return classes[direction];
}

function getArtistNames(issue: KpopIssue) {
  return issue.relatedArtistIds
    .map((artistId) => getArtistV3ById(artistId))
    .filter((artist): artist is NonNullable<typeof artist> => Boolean(artist))
    .map((artist) => artist.nameEn);
}

function getIssueMovement(issue: KpopIssue) {
  const artistId = issue.relatedArtistIds[0];
  const artist = artistId ? getArtistV3ById(artistId) : null;

  if (!artist) {
    return null;
  }

  const history = getArtistPriceHistory(artist.id);
  const before = history[Math.max(history.length - 3, 0)];
  const after = history[history.length - 1];

  if (!before || !after || before.price === 0) {
    return null;
  }

  const changeRate = ((after.price - before.price) / before.price) * 100;

  return {
    artist,
    before,
    after,
    changeRate,
    interpretation:
      changeRate >= 3
        ? 'Positive price reaction appears related to the issue window.'
        : changeRate <= -2
          ? 'Cooling reaction is a signal to watch, not a trading signal.'
          : 'Movement is moderate and may reflect mixed market attention.',
  };
}

function getIssueMetrics(issue: KpopIssue) {
  const movement = getIssueMovement(issue);
  const relatedVolume = issue.relatedArtistIds.reduce((sum, artistId) => {
    const history = getArtistPriceHistory(artistId);
    const latest = history[history.length - 1];
    return sum + (latest?.volume ?? 0);
  }, 0);

  return {
    priceReaction: movement ? formatPercent(movement.changeRate) : 'Watch',
    attentionVolume: formatLargeNumber(relatedVolume),
    searchSocial: `+${issue.searchGrowthRate.toFixed(1)}%`,
    newsExposure: `${issue.newsCount} items`,
    fandomSentiment:
      issue.issueScore >= 85
        ? 'Strong'
        : issue.issueScore >= 70
          ? 'Active'
          : 'Watch',
  };
}

export default function SignalsPage() {
  const primaryIssues = trendingIssues.slice(0, 6);
  const featuredMovement = getIssueMovement(primaryIssues[0]);

  return (
    <main className="min-h-screen bg-[#070A12] px-5 py-10 text-white">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
                MARKET SIGNALS
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">
                Issue impact signals
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
                Connect K-pop issues to simulated FANDEX price movement,
                attention volume, fandom reaction, search demand, news exposure,
                and content opportunities.
              </p>
              <p className="mt-4 max-w-3xl rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm font-bold leading-6 text-cyan-100">
                FANDEX price is an internal simulated artist market index. It
                is not a real stock, security, investment product, or financial
                advice.
              </p>
              <p className="mt-3 max-w-3xl rounded-2xl border border-slate-700 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
                Experimental route: signals may later be absorbed into home and
                artist pages as badges, or become a dedicated market alert
                system with source data, confidence, related news, and graph
                impact.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/compare?artists=aespa,ive,riize"
                className="rounded-full bg-cyan-300 px-4 py-2 text-xs font-black text-slate-950 hover:bg-cyan-200"
              >
                Compare artists
              </Link>
              <Link
                href="/ranking"
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-300 hover:border-cyan-300 hover:text-cyan-300"
              >
                View ranking
              </Link>
              <Link
                href="/"
                className="rounded-full border border-slate-700 px-4 py-2 text-xs font-black text-slate-300 hover:border-cyan-300 hover:text-cyan-300"
              >
                Back to market home
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {primaryIssues.map((issue) => {
            const direction = getImpactDirection(issue);
            const artistNames = getArtistNames(issue);

            return (
              <article
                key={issue.id}
                className="rounded-3xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cyan-300 px-2.5 py-1 text-xs font-black text-slate-950">
                    #{issue.rank}
                  </span>
                  <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-bold text-slate-400">
                    {issue.category}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-black ${getDirectionClass(
                      direction
                    )}`}
                  >
                    {direction}
                  </span>
                </div>

                <h2 className="mt-4 text-xl font-black">{issue.headline}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {issue.summary}
                </p>
                <p className="mt-4 text-xs font-bold text-slate-500">
                  Related artists: {artistNames.join(', ') || 'Market-wide'}
                </p>
              </article>
            );
          })}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Impact metrics
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Issue impact indicators
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              These indicators are derived from mock issue and artist data to
              show how FANDEX can explain market reaction.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {primaryIssues.slice(0, 4).map((issue) => {
              const metrics = getIssueMetrics(issue);

              return (
                <article
                  key={`${issue.id}-metrics`}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                >
                  <h3 className="font-black">{issue.headline}</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <Metric label="Price reaction" value={metrics.priceReaction} />
                    <Metric label="Attention volume" value={metrics.attentionVolume} />
                    <Metric label="Search/social" value={metrics.searchSocial} />
                    <Metric label="News exposure" value={metrics.newsExposure} />
                    <Metric label="Fandom sentiment" value={metrics.fandomSentiment} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Before and after
            </p>
            <h2 className="mt-2 text-2xl font-black">
              FANDEX movement around issue windows
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              This simple before/after view uses related artist mock price
              history. It suggests context, not causation or advice.
            </p>

            {featuredMovement && (
              <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <p className="text-xs font-black text-cyan-300">
                  Featured movement
                </p>
                <h3 className="mt-2 text-xl font-black">
                  {featuredMovement.artist.nameEn}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Metric
                    label="Before issue"
                    value={`${formatPrice(featuredMovement.before.price)} FDX`}
                  />
                  <Metric
                    label="After issue"
                    value={`${formatPrice(featuredMovement.after.price)} FDX`}
                  />
                  <Metric
                    label="Change"
                    value={formatPercent(featuredMovement.changeRate)}
                  />
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-400">
                  {featuredMovement.interpretation}
                </p>
              </div>
            )}
          </section>

          <section className="space-y-3">
            {primaryIssues.slice(0, 5).map((issue) => {
              const movement = getIssueMovement(issue);

              if (!movement) {
                return null;
              }

              return (
                <article
                  key={`${issue.id}-movement`}
                  className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-black text-cyan-300">
                        {movement.artist.ticker}
                      </p>
                      <h3 className="mt-1 font-black">{issue.headline}</h3>
                    </div>
                    <Link
                      href={`/artists/${movement.artist.id}`}
                      className="w-fit rounded-full border border-slate-700 px-3 py-1.5 text-xs font-black text-slate-300 hover:border-cyan-300 hover:text-cyan-300"
                    >
                      Artist detail
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    <Metric label="Before" value={formatPrice(movement.before.price)} />
                    <Metric label="After" value={formatPrice(movement.after.price)} />
                    <Metric label="Change" value={formatPercent(movement.changeRate)} />
                    <Metric label="Signal" value={getImpactDirection(issue)} />
                  </div>
                </article>
              );
            })}
          </section>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
              Issue to content
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Turn issue signals into SNS ideas
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Mock content angles only. No external AI API or upload workflow is
              used on this page.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {primaryIssues.slice(0, 4).map((issue) => {
              const artistNames = getArtistNames(issue);
              const primaryArtist = artistNames[0] ?? 'the artist';

              return (
                <article
                  key={`${issue.id}-content`}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-5"
                >
                  <h3 className="font-black">{issue.headline}</h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <ContentAngle
                      label="Short-form hook"
                      value={`Why ${primaryArtist}'s latest issue signal is moving FANDEX attention.`}
                    />
                    <ContentAngle
                      label="Feed post angle"
                      value={`Break down price reaction, search demand, and fandom response in one carousel.`}
                    />
                    <ContentAngle
                      label="Thread/X angle"
                      value={`A quick thread on how ${issue.category.toLowerCase()} signals may affect artist momentum.`}
                    />
                    <ContentAngle
                      label="Fandom question"
                      value={`Which signal matters more right now: issue buzz, content reaction, or fandom activity?`}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
                Next action
              </p>
              <h2 className="mt-2 text-3xl font-black">
                Compare the artists behind the signals.
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-cyan-100">
                Start with aespa, IVE, and RIIZE to compare price, factor
                leaders, issue context, and content opportunities.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/compare?artists=aespa,ive,riize"
                className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 hover:bg-cyan-200"
              >
                Compare artists
              </Link>
              <Link
                href="/ranking"
                className="rounded-full border border-cyan-300/40 px-5 py-3 text-sm font-black text-cyan-100 hover:border-cyan-200"
              >
                View ranking
              </Link>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-900 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}

function ContentAngle({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-900 p-3">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-300">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{value}</p>
    </div>
  );
}
