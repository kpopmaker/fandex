import Link from 'next/link';
import { notFound } from 'next/navigation';
import CustomIndexBuilder from '../../components/v3/CustomIndexBuilder';
import ArtistNewsSection from '../../components/v3/ArtistNewsSection';
import LineChartCard from '../../components/v3/LineChartCard';
import {
  artistUniverse,
  getArtistV3ById,
} from '../../data/v3/artistUniverse';
import {
  getArtistChartPoints,
  getArtistPriceHistory,
  getNewsByArtistId,
} from '../../data/v3/mockData';

type PageProps = {
  params: Promise<{
    artistId: string;
  }>;
};

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

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-[#070A12] dark:text-white">
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/"
            className="text-sm font-bold text-cyan-600 hover:text-cyan-500 dark:text-cyan-300"
          >
            Back to market
          </Link>

          <Link
            href={`/compare?artists=${artist.id}`}
            className="text-sm font-bold text-slate-500 hover:text-cyan-500 dark:text-slate-400 dark:hover:text-cyan-300"
          >
            Compare this artist
          </Link>
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <p className="font-mono text-sm font-black text-cyan-600 dark:text-cyan-300">
              {artist.ticker}
            </p>

            <h1 className="mt-3 text-5xl font-black tracking-tight">
              {artist.nameEn}
            </h1>

            <p className="mt-2 text-lg font-bold text-slate-500 dark:text-slate-400">
              {artist.type} / {artist.generation}
            </p>

            <p className="mt-5 text-sm leading-7 text-slate-600 dark:text-slate-300">
              {artist.shortIntro}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <InfoCard label="Agency" value={artist.agency} />
              <InfoCard label="Debut date" value={artist.debutDate} />
              <InfoCard label="Type" value={artist.type} />
              <InfoCard label="Generation" value={artist.generation} />
              <InfoCard label="Status" value={artist.status} />
              <InfoCard label="Fandom" value={artist.fandomName ?? 'Not registered'} />
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm font-black text-slate-500 dark:text-slate-400">
                Members
              </p>

              <div className="flex flex-wrap gap-2">
                {artist.members.map((member) => (
                  <span
                    key={member}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {member}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <MarketStat
                label="Current price"
                value={`${latestPrice.price.toFixed(2)} FDX`}
                tone="black"
              />
              <MarketStat
                label="Change rate"
                value={`${isUp ? '+' : ''}${priceChangeRate.toFixed(2)}%`}
                tone={isUp ? 'red' : 'blue'}
              />
              <MarketStat
                label="Volume"
                value={formatLargeNumber(latestPrice.volume)}
                tone="purple"
              />
              <MarketStat
                label="Fan size"
                value={formatLargeNumber(latestPrice.fanSizeValue)}
                tone="cyan"
              />
            </div>

            <LineChartCard
              title={`${artist.nameEn} FANDEX price`}
              subtitle="Intraday simulated price movement"
              points={chartPoints}
              valueSuffix=" FDX"
              height={360}
            />
          </div>
        </div>

        <div className="mb-6">
          <CustomIndexBuilder
            artistName={artist.nameEn}
            priceHistory={priceHistory}
          />
        </div>

        <ArtistNewsSection newsItems={newsItems} />
      </section>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/60">
      <p className="text-xs font-bold text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-950 dark:text-white">
        {value}
      </p>
    </div>
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
