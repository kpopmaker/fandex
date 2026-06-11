import Link from 'next/link';
import { getMockArtistPrices } from '../data/mockPrices';

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value);
}

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export default function RankingPage() {
  const prices = getMockArtistPrices();

  const risingRanking = [...prices].sort(
    (a, b) => b.changeRate - a.changeRate
  );

  const volumeRanking = [...prices].sort(
    (a, b) => b.volume - a.volume
  );

  const fanCapRanking = [...prices].sort(
    (a, b) => b.fanCap - a.fanCap
  );

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
            FANDEX RANKING
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            K-pop Artist Ranking
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
            FANDEX v2 mock price engine을 기준으로 상승률, 거래량, Fan Cap 순위를 보여줍니다.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <RankingCard
            title="급등률 TOP"
            description="현재 커스텀 없이 종합 주가 기준으로 가장 많이 오른 아티스트"
            items={risingRanking.slice(0, 5)}
            valueType="change"
          />

          <RankingCard
            title="거래량 TOP"
            description="최근 반응량이 가장 크게 움직인 아티스트"
            items={volumeRanking.slice(0, 5)}
            valueType="volume"
          />

          <RankingCard
            title="Fan Cap TOP"
            description="가상 팬덤 시가총액이 가장 큰 아티스트"
            items={fanCapRanking.slice(0, 5)}
            valueType="fanCap"
          />
        </div>
      </section>
    </main>
  );
}

type RankingItem = ReturnType<typeof getMockArtistPrices>[number];

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
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="mb-5">
        <h2 className="text-xl font-black">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
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
              className="block rounded-2xl border border-slate-800 bg-slate-900/50 p-4 transition hover:border-cyan-400/50 hover:bg-slate-900"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-cyan-300">
                    {index + 1}
                  </div>

                  <div>
                    <p className="font-black text-white">
                      {item.nameKo}
                    </p>
                    <p className="font-mono text-xs text-slate-500">
                      {item.ticker} · {item.agency}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  {valueType === 'change' && (
                    <>
                      <p
                        className={`font-mono text-lg font-black ${
                          isUp ? 'text-red-300' : 'text-blue-300'
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
                      <p className="font-mono text-lg font-black text-purple-300">
                        {formatNumber(item.volume)}
                      </p>
                      <p className="text-xs text-slate-500">
                        volume
                      </p>
                    </>
                  )}

                  {valueType === 'fanCap' && (
                    <>
                      <p className="font-mono text-lg font-black text-cyan-300">
                        {formatLargeNumber(item.fanCap)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Fan Cap
                      </p>
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