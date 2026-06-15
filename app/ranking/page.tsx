import Link from 'next/link';
import { getArtistRankingRowsV4 } from '../data/v4/artistRanking';

function formatNumber(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export default function RankingPage() {
  const prices = getArtistRankingRowsV4();

  const risingRanking = [...prices].sort(
    (a, b) => b.changeRate - a.changeRate
  );

  const volumeRanking = [...prices].sort((a, b) => b.volume - a.volume);

  const fanCapRanking = [...prices].sort((a, b) => b.fanCap - a.fanCap);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-sky-50 text-slate-950">
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
            FANDEX RANKING
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            K-pop artist ranking
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-500 md:text-base">
            Rank artists by simulated FANDEX price movement, attention volume,
            and fan size value.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <RankingCard
            title="Top change"
            description="Artists with the strongest simulated FANDEX price movement."
            items={risingRanking.slice(0, 5)}
            valueType="change"
          />

          <RankingCard
            title="Top volume"
            description="Artists with the largest recent attention volume."
            items={volumeRanking.slice(0, 5)}
            valueType="volume"
          />

          <RankingCard
            title="Top fan size"
            description="Artists with the largest simulated fandom value metric."
            items={fanCapRanking.slice(0, 5)}
            valueType="fanCap"
          />
        </div>
      </section>
    </main>
  );
}

type RankingItem = ReturnType<typeof getArtistRankingRowsV4>[number];

function RankingCard({
  title,
  description,
  items,
  valueType,
}: {
  title: string;
  description: string;
  items: RankingItem[];
  valueType: 'change' | 'volume' | 'fanCap';
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-black">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {description}
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => {
          const isUp = item.changeRate >= 0;

          return (
            <Link
              key={item.artistId}
              href={`/artists/${item.artistId}`}
              className="block rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-cyan-400/50 hover:bg-white"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-50 text-sm font-black text-cyan-700">
                    {index + 1}
                  </div>

                  <div>
                    <p className="font-black text-slate-950">{item.nameEn}</p>
                    <p className="font-mono text-xs text-slate-500">
                      {item.ticker} / {item.agency}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  {valueType === 'change' && (
                    <>
                      <p
                        className={`font-mono text-lg font-black ${
                        isUp ? 'text-red-500' : 'text-blue-500'
                        }`}
                      >
                        {isUp ? '+' : ''}
                        {item.changeRate.toFixed(2)}%
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.price.toFixed(2)} FDX
                      </p>
                    </>
                  )}

                  {valueType === 'volume' && (
                    <>
                      <p className="font-mono text-lg font-black text-purple-500">
                        {formatNumber(item.volume)}
                      </p>
                      <p className="text-xs text-slate-500">volume</p>
                    </>
                  )}

                  {valueType === 'fanCap' && (
                    <>
                      <p className="font-mono text-lg font-black text-cyan-600">
                        {formatLargeNumber(item.fanCap)}
                      </p>
                      <p className="text-xs text-slate-500">fan size</p>
                    </>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
