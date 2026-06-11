import Link from 'next/link';
import { notFound } from 'next/navigation';
import { artists, getArtistById } from '../../data/artists';
import {
  factorDefinitions,
  getMockArtistPriceById,
} from '../../data/mockPrices';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

type ArtistPrice = NonNullable<ReturnType<typeof getMockArtistPriceById>>;

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function getSignalLabel(signal: string) {
  const labels: Record<string, string> = {
    surging: '급등',
    rising: '상승',
    neutral: '중립',
    falling: '하락',
    plunging: '급락',
    volume_spike: '거래량 폭증',
  };

  return labels[signal] ?? signal;
}

function getSignalClass(signal: string) {
  if (signal === 'surging') {
    return 'border-red-500/30 bg-red-500/15 text-red-300';
  }

  if (signal === 'rising') {
    return 'border-orange-500/30 bg-orange-500/15 text-orange-300';
  }

  if (signal === 'falling') {
    return 'border-blue-500/30 bg-blue-500/15 text-blue-300';
  }

  if (signal === 'plunging') {
    return 'border-indigo-500/30 bg-indigo-500/15 text-indigo-300';
  }

  if (signal === 'volume_spike') {
    return 'border-purple-500/30 bg-purple-500/15 text-purple-300';
  }

  return 'border-slate-600 bg-slate-700/40 text-slate-300';
}

function isArtistPrice(value: ArtistPrice | undefined): value is ArtistPrice {
  return value !== undefined;
}

function getMockHistory(artistId: string): ArtistPrice[] {
  const now = new Date();

  return Array.from({ length: 24 })
    .map((_, index) => {
      const minutesAgo = 23 - index;
      const targetTime = new Date(now.getTime() - minutesAgo * 60_000);

      return getMockArtistPriceById(artistId, {
        now: targetTime,
      });
    })
    .filter(isArtistPrice);
}

export function generateStaticParams() {
  return artists.map((artist) => ({
    slug: artist.id,
  }));
}

export default async function ArtistDetailPage({ params }: PageProps) {
  const { slug } = await params;

  const artist = getArtistById(slug);
  const price = getMockArtistPriceById(slug);

  if (!artist || !price) {
    notFound();
  }

  const history = getMockHistory(slug);
  const isUp = price.changeRate >= 0;

  const historyPrices = history.map((item) => item.price);
  const maxHistoryPrice = Math.max(...historyPrices);
  const minHistoryPrice = Math.min(...historyPrices);
  const priceRange = maxHistoryPrice - minHistoryPrice || 1;

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-5 py-10">
        <Link
          href="/artists"
          className="mb-6 inline-flex rounded-full border border-slate-700 px-4 py-2 text-sm font-bold text-slate-300 transition hover:border-cyan-300 hover:text-cyan-300"
        >
          ← Artist list
        </Link>

        <div className="mb-6 rounded-3xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 via-slate-950 to-slate-950 p-6 md:p-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="font-mono text-sm font-black text-cyan-300">
                {artist.ticker}
              </p>

              <h1 className="mt-2 text-5xl font-black tracking-tight">
                {artist.nameKo}
              </h1>

              <p className="mt-3 text-lg text-slate-400">
                {artist.nameEn} · {artist.agency}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
                  {artist.gender}
                </span>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
                  {artist.generation}
                </span>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
                  {artist.trackingTier}
                </span>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
                  Debut {artist.debutDate}
                </span>
              </div>
            </div>

            <div className="text-left lg:text-right">
              <p className="text-sm text-slate-400">FANDEX Price</p>
              <p className="mt-1 font-mono text-5xl font-black">
                {price.price.toFixed(2)}
              </p>
              <p
                className={`mt-2 font-mono text-2xl font-black ${
                  isUp ? 'text-red-300' : 'text-blue-300'
                }`}
              >
                {isUp ? '+' : ''}
                {price.changeRate.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Volume" value={formatNumber(price.volume)} tone="purple" />
          <StatCard label="Fan Cap" value={formatLargeNumber(price.fanCap)} tone="cyan" />
          <StatCard
            label="Momentum"
            value={`${price.momentum > 0 ? '+' : ''}${price.momentum.toFixed(2)}`}
            tone="white"
          />
          <StatCard
            label="Confidence"
            value={price.confidence.toFixed(1)}
            tone="white"
          />

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <p className="text-sm text-slate-400">Signal</p>
            <span
              className={`mt-3 inline-flex rounded-full border px-3 py-1 text-sm font-black ${getSignalClass(
                price.signal
              )}`}
            >
              {getSignalLabel(price.signal)}
            </span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Mock 1-Min Price Chart</h2>
                <p className="mt-1 text-sm text-slate-400">
                  최근 24분 기준 mock 가격 흐름입니다.
                </p>
              </div>

              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-slate-400">
                1M
              </span>
            </div>

            <div className="flex h-72 items-end gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
              {history.map((item, index) => {
                const height =
                  ((item.price - minHistoryPrice) / priceRange) * 85 + 10;
                const previous = history[index - 1];
                const isRising = previous ? item.price >= previous.price : true;

                return (
                  <div
                    key={`${item.artistId}-${item.updatedAt}`}
                    className="flex flex-1 flex-col items-center justify-end"
                  >
                    <div
                      className={`w-full rounded-t-md ${
                        isRising ? 'bg-red-400' : 'bg-blue-400'
                      }`}
                      style={{ height: `${height}%` }}
                      title={`${item.price.toFixed(2)} FDX`}
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex justify-between text-xs text-slate-500">
              <span>-24m</span>
              <span>Now</span>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="text-xl font-black">Artist Master</h2>

            <div className="mt-5 space-y-4">
              <InfoBlock title="Members" items={artist.members} />
              <InfoBlock title="Aliases" items={artist.aliases} />
              <InfoBlock title="Keywords" items={artist.keywords} />
              <InfoBlock title="Country Focus" items={artist.countryFocus} />
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="mb-5">
            <h2 className="text-xl font-black">Factor Breakdown</h2>
            <p className="mt-1 text-sm text-slate-400">
              FANDEX Price를 구성하는 요소별 점수입니다.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {factorDefinitions.map((factor) => {
              const score = price.factorScores[factor.key];

              return (
                <div
                  key={factor.key}
                  className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-white">{factor.label}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        기본 가중치 {factor.defaultWeight}%
                      </p>
                    </div>

                    <p className="font-mono text-2xl font-black text-cyan-300">
                      {score.toFixed(1)}
                    </p>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-cyan-300"
                      style={{ width: `${score}%` }}
                    />
                  </div>

                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    {factor.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="text-xl font-black">Source Accounts</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(artist.sourceAccounts).map(([key, value]) => (
              <div
                key={key}
                className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
              >
                <p className="text-xs text-slate-500">{key}</p>
                <p className="mt-1 break-all font-mono text-sm text-slate-300">
                  {value || '미등록'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'cyan' | 'purple' | 'white';
}) {
  const toneClass =
    tone === 'cyan'
      ? 'text-cyan-300'
      : tone === 'purple'
        ? 'text-purple-300'
        : 'text-white';

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-black ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

function InfoBlock({
  title,
  items,
}: {
  title: string;
  items: readonly string[];
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-bold text-slate-400">{title}</p>

      <div className="flex flex-wrap gap-2">
        {items.length > 0 ? (
          items.map((item) => (
            <span
              key={item}
              className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300"
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">미등록</span>
        )}
      </div>
    </div>
  );
}