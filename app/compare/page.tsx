import Link from 'next/link';

import ComparePriceChart from '../components/v3/ComparePriceChart';

import { artistUniverse, getArtistV3ById } from '../data/v3/artistUniverse';
import { factorDefinitionsV3, getArtistPriceHistory } from '../data/v3/mockData';

const defaultArtistIds = ['aespa', 'ive', 'riize'];

type ComparePageProps = {
  searchParams?: Promise<{
    artists?: string | string[];
  }>;
};

type CompareRow = {
  artist: NonNullable<ReturnType<typeof getArtistV3ById>>;
  history: ReturnType<typeof getArtistPriceHistory>;
  latest: ReturnType<typeof getArtistPriceHistory>[number];
  changeRate: number;
  isUp: boolean;
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
  return value.toFixed(2);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function formatLargeNumber(value: number): string {
  if (!Number.isFinite(value)) {
    return '-';
  }

  if (Math.abs(value) >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`;
  }

  if (Math.abs(value) >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }

  return String(value);
}

function createCompareHref(ids: string[]): string {
  const uniqueIds = Array.from(new Set(ids)).filter(Boolean).slice(0, 4);
  return `/compare?artists=${uniqueIds.join(',')}`;
}

function getLeader(
  rows: CompareRow[],
  selectValue: (row: CompareRow) => number
): CompareRow | null {
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
      const artist = getArtistV3ById(id);

      if (!artist) {
        return null;
      }

      const history = getArtistPriceHistory(artist.id);
      const first = history[0];
      const latest = history[history.length - 1];

      if (!first || !latest) {
        return null;
      }

      const changeRate = ((latest.price - first.price) / first.price) * 100;

      return {
        artist,
        history,
        latest,
        changeRate,
        isUp: changeRate >= 0,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));

  const insightCards = [
    {
      label: 'Top price',
      row: getLeader(compareRows, (row) => row.latest.price),
      value: (row: CompareRow) => formatPrice(row.latest.price),
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
      row: getLeader(compareRows, (row) => row.latest.volume),
      value: (row: CompareRow) => formatLargeNumber(row.latest.volume),
      note: 'Largest activity volume',
    },
    {
      label: 'Top fan size',
      row: getLeader(compareRows, (row) => row.latest.fanSizeValue),
      value: (row: CompareRow) => formatLargeNumber(row.latest.fanSizeValue),
      note: 'Largest simulated fan value',
    },
  ];

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

              <h2 className="mt-1 text-2xl font-black">
                {row.artist.nameEn}
              </h2>

              <p className="mt-1 text-xs font-bold text-slate-500">
                Artist market signal
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <MiniStat label="Current price" value={formatPrice(row.latest.price)} />
                <MiniStat label="Change rate" value={formatPercent(row.changeRate)} />
                <MiniStat label="Volume" value={formatLargeNumber(row.latest.volume)} />
                <MiniStat
                  label="Fan size"
                  value={formatLargeNumber(row.latest.fanSizeValue)}
                />
              </div>
            </article>
          ))}
        </section>

        <ComparePriceChart rows={compareRows} />

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
                (row) => row.latest.scores[factor.key]
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
                      const score = row.latest.scores[factor.key];

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
                  href={isDisabled ? createCompareHref(selectedIds) : createCompareHref(safeNextIds)}
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
