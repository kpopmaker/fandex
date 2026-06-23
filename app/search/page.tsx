'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { artistUniverseV4 } from '../data/v4/artistUniverse';
import { getArtistPriceHistoryV4 } from '../data/v4/artistPriceHistory';
import { getArtistRankingRowsV4 } from '../data/v4/artistRanking';

const lockedResearchItems = [
  {
    title: 'AI Interpretation',
    description:
      'Subscriber research unlocks deeper context behind the preview signal.',
  },
  {
    title: 'Full Artist Research Brief',
    description:
      'A complete weekly read on artist movement, issue context, and market fit.',
  },
  {
    title: 'Brand-fit Analysis',
    description:
      'Campaign angles, ambassador fit, and collaboration positioning signals.',
  },
  {
    title: 'Issue Risk Analysis',
    description:
      'Watch terms, concentration risk, and volatility notes for campaign timing.',
  },
  {
    title: 'Artist Comparison Report',
    description:
      'Side-by-side artist signal profiles for marketing and research decisions.',
  },
  {
    title: 'Weekly FANDEX Report',
    description:
      'A recurring subscriber brief covering watchlists and signal commentary.',
  },
  {
    title: 'Watchlist & Signal Commentary',
    description:
      'Ongoing signal changes and why they matter for entertainment marketing.',
  },
];

const suggestionQueries = ['IVE', 'RIIZE', 'NewJeans', 'aespa'];

const rankingRows = getArtistRankingRowsV4();
const searchableArtists = artistUniverseV4.map((artist) => {
  const ranking = rankingRows.find((row) => row.artistId === artist.id);
  const history = getArtistPriceHistoryV4(artist.id);
  const latest = history[history.length - 1];
  const issueBreakdown =
    latest?.issueScoreBreakdown ?? latest?.scoreBreakdown.issueScoreBreakdown;
  const issueSummary = latest?.issueSignalsSummary;
  const issueTone = getIssueTonePreview({
    issueScore: issueBreakdown?.issueScore ?? 50,
    riskScore: issueBreakdown?.controversyRiskScore ?? 0,
    positiveCount: issueSummary?.positiveIssueCount ?? 0,
    negativeCount: issueSummary?.negativeIssueCount ?? 0,
  });

  return {
    id: artist.id,
    ticker: artist.ticker,
    name: artist.nameEn,
    agency: artist.agency,
    generation: artist.generation,
    fandomName: artist.fandomName,
    aliases: artist.profile.aliases,
    score: ranking?.price ?? latest?.price ?? 0,
    rankScore: artist.collection.priorityScore,
    changeRate: ranking?.changeRate ?? latest?.changeRate ?? 0,
    issueTone,
    signalSummary: createSignalSummary({
      issueTone,
      activeCount: issueSummary?.activeIssueCount ?? 0,
      positiveCount: issueSummary?.positiveIssueCount ?? 0,
      negativeCount: issueSummary?.negativeIssueCount ?? 0,
    }),
  };
});

export default function SearchPreviewPage() {
  const [query, setQuery] = useState('IVE');
  const normalizedQuery = query.trim().toLocaleLowerCase('en-US');
  const results = useMemo(() => {
    if (normalizedQuery.length === 0) {
      return searchableArtists.slice(0, 4);
    }

    return searchableArtists
      .filter((artist) =>
        [artist.name, artist.ticker, artist.id, artist.agency, ...artist.aliases]
          .filter(Boolean)
          .some((value) =>
            value.toLocaleLowerCase('en-US').includes(normalizedQuery),
          ),
      )
      .slice(0, 6);
  }, [normalizedQuery]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 text-slate-950">
      <section className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <section className="rounded-3xl border border-cyan-200 bg-white p-7 shadow-lg shadow-cyan-100/60">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">
                FANDEX Search Preview
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-6xl">
                Start with a quick artist signal check
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-600">
                Check a K-pop artist or issue you saw from FANDEX Signal content.
                Free preview shows basic artist signal context and issue tone.
                Full AI interpretation and research briefs are reserved for
                Early Access subscriber research.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link
                href="/sample-report"
                className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
              >
                View Sample Report
              </Link>
              <Link
                href="/#waitlist-form"
                className="rounded-full border border-cyan-200 bg-cyan-50 px-5 py-3 text-sm font-black text-cyan-700 shadow-sm hover:bg-cyan-100"
              >
                Join Early Access
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <label className="text-sm font-black text-slate-700">
              Search artist, group, or ticker
              <input
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try IVE, RIIZE, NewJeans"
                type="search"
                value={query}
              />
            </label>
            <button
              type="button"
              className="rounded-full bg-cyan-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-cyan-400"
            >
              Search Preview
            </button>
          </div>

          {results.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-600">
                No preview match yet. Try one of these sample searches:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {suggestionQueries.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:border-cyan-300 hover:text-cyan-700"
                    onClick={() => setQuery(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {results.map((artist) => (
                <ArtistPreviewCard key={artist.id} artist={artist} />
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-cyan-200 bg-white p-6 shadow-lg shadow-cyan-100/60">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-600">
              Subscriber Research Lock
            </p>
            <h2 className="mt-2 text-2xl font-black">
              Preview only. Deeper interpretation is subscriber research.
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Free search helps validate the signal. Subscriber research unlocks
              deeper context, campaign angles, risk interpretation, and weekly
              commentary.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {lockedResearchItems.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm"
              >
                <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-cyan-700 shadow-sm">
                  Early Access
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {item.description}
                </p>
                <Link
                  href="/#waitlist-form"
                  className="mt-4 inline-flex rounded-full border border-cyan-200 bg-white px-4 py-2 text-xs font-black text-cyan-700 shadow-sm hover:bg-cyan-50"
                >
                  Request Subscriber Research
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-bold leading-6 text-slate-500">
            FANDEX Search Preview uses local preview data only. It does not log
            in users, process payment, call APIs, fetch external data, or check
            subscription status. Subscriber cards are static Early Access
            research previews.
          </p>
        </section>
      </section>
    </main>
  );
}

function ArtistPreviewCard({
  artist,
}: {
  artist: (typeof searchableArtists)[number];
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-600">
            {artist.ticker}
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            {artist.name}
          </h2>
          <p className="mt-1 text-sm font-bold text-slate-500">
            {artist.agency}
            {artist.generation ? ` / ${artist.generation}` : ''}
            {artist.fandomName ? ` / ${artist.fandomName}` : ''}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600 shadow-sm">
          Free preview
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <PreviewMetric label="FANDEX score" value={artist.score.toFixed(2)} />
        <PreviewMetric label="Priority" value={String(artist.rankScore)} />
        <PreviewMetric
          label="Issue tone"
          value={artist.issueTone}
          valueClassName={getIssueToneClass(artist.issueTone)}
        />
      </div>

      <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold leading-6 text-slate-600">
        {artist.signalSummary}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/sample-report"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700"
        >
          View Sample Report
        </Link>
        <Link
          href="/#waitlist-form"
          className="rounded-full bg-cyan-500 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-cyan-400"
        >
          Unlock subscriber research
        </Link>
      </div>
    </article>
  );
}

function PreviewMetric({
  label,
  value,
  valueClassName = 'text-slate-950',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className={`mt-1 text-sm font-black ${valueClassName}`}>{value}</p>
    </div>
  );
}

function getIssueTonePreview({
  issueScore,
  riskScore,
  positiveCount,
  negativeCount,
}: {
  issueScore: number;
  riskScore: number;
  positiveCount: number;
  negativeCount: number;
}) {
  if (riskScore >= 60 || negativeCount > positiveCount) {
    return 'Watch';
  }

  if (issueScore >= 60 && positiveCount >= negativeCount) {
    return 'Positive';
  }

  return 'Balanced';
}

function getIssueToneClass(issueTone: string) {
  if (issueTone === 'Positive') {
    return 'text-cyan-700';
  }

  if (issueTone === 'Watch') {
    return 'text-blue-700';
  }

  return 'text-slate-700';
}

function createSignalSummary({
  issueTone,
  activeCount,
  positiveCount,
  negativeCount,
}: {
  issueTone: string;
  activeCount: number;
  positiveCount: number;
  negativeCount: number;
}) {
  return `${issueTone} issue tone preview based on ${activeCount} active local signal samples. Positive ${positiveCount}, watch ${negativeCount}. Full AI interpretation is reserved for subscriber research.`;
}
