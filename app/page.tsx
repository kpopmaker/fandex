import DataNotice from './components/market/DataNotice';
import IndexHero from './components/market/IndexHero';
import NewsList from './components/market/NewsList';
import QuoteList from './components/market/QuoteList';
import { getHomeModel } from '../lib/market/queries';

export const dynamic = 'force-dynamic';

export default function Home() {
  const model = getHomeModel();

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 lg:px-8">
      <DataNotice meta={model.meta} />
      <div className="mt-4">
        <IndexHero
          value={model.index.value}
          series={model.index.series}
          advancers={model.index.advancers}
          decliners={model.index.decliners}
          artistCount={model.meta.artistCount}
          totalFanCap={model.index.totalFanCap}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr]">
        <div className="lg:col-span-2 xl:col-span-1">
          <NewsList items={model.news} isMock={model.meta.dataKind === 'mock'} />
        </div>
        <QuoteList
          title="종합 Top 5"
          caption="FANDEX 가격이 높은 순"
          quotes={model.topOverall}
          moreHref="/ranking"
        />
        <QuoteList
          title="급상승 Top 5"
          caption="최근 1일 상승률 순"
          quotes={model.topRising}
          moreHref="/ranking?sort=rise&period=1D"
        />
      </div>
    </main>
  );
}
