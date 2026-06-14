import Link from 'next/link';
import { getMockArtistPrices } from '../data/mockPrices';

function formatLargeNumber(value: number) {
  return new Intl.NumberFormat('ko-KR', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

export default function ArtistsPage() {
  const prices = getMockArtistPrices();

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-cyan-50 text-slate-950 dark:bg-[#070A12] dark:text-white">
      <section className="mx-auto max-w-7xl px-5 py-10">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm font-bold text-cyan-300 hover:text-cyan-200"
          >
            ← FANDEX 홈으로
          </Link>

          <p className="mt-6 text-sm font-bold uppercase tracking-[0.3em] text-cyan-300">
            ARTIST MARKET
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
            아티스트 종목
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
            FANDEX에 등록된 K-pop 아티스트 종목 목록입니다. 각 아티스트는
            하나의 주식 종목처럼 현재가, 등락률, 거래량, Fan Cap을 가집니다.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {prices.map((item) => {
            const isUp = item.changeRate >= 0;

            return (
              <Link
                key={item.artistId}
                href={`/artists/${item.artistId}`}
                className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-400/50 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/70 dark:hover:bg-slate-900/80"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-sm font-black text-cyan-300">
                      {item.ticker}
                    </p>

                    <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                      {item.nameKo}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.nameEn} · {item.agency}
                    </p>
                  </div>

                  <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {item.trackingTier}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
                    <p className="text-xs text-slate-500">Price</p>
                    <p className="mt-1 font-mono text-2xl font-black">
                      {item.price.toFixed(2)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
                    <p className="text-xs text-slate-500">Change</p>
                    <p
                      className={`mt-1 font-mono text-2xl font-black ${
                        isUp ? 'text-red-300' : 'text-blue-300'
                      }`}
                    >
                      {isUp ? '+' : ''}
                      {item.changeRate.toFixed(2)}%
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
                    <p className="text-xs text-slate-500">Volume</p>
                    <p className="mt-1 font-mono text-xl font-black text-purple-300">
                      {formatLargeNumber(item.volume)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/70">
                    <p className="text-xs text-slate-500">Fan Cap</p>
                    <p className="mt-1 font-mono text-xl font-black text-cyan-300">
                      {formatLargeNumber(item.fanCap)}
                    </p>
                  </div>
                </div>

                <p className="mt-5 text-sm font-bold text-slate-400 group-hover:text-cyan-300">
                  종목 상세 보기 →
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
