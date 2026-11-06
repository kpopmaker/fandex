import DataNotice from './components/market/DataNotice';
import DataUnavailable from './components/market/DataUnavailable';
import IndexHero from './components/market/IndexHero';
import NewsList from './components/market/NewsList';
import QuoteList from './components/market/QuoteList';
import { MarketDataUnavailableError } from '../lib/market/dataset';
import { getHomeModel, type HomeModel } from '../lib/market/queries';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let model: HomeModel;
  try {
    model = await getHomeModel();
  } catch (error) {
    if (error instanceof MarketDataUnavailableError) return <DataUnavailable />;
    throw error;
  }

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
          startedAt={model.meta.startedAt}
          hasDayHistory={model.index.change1D !== null}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr]">
        <div className="lg:col-span-2 xl:col-span-1">
          <NewsList items={model.news} />
        </div>
        <QuoteList
          title="종합 Top 5"
          caption="FANDEX 가격이 높은 순"
          quotes={model.topOverall}
          moreHref="/ranking"
          emptyText="아직 시세가 없어요."
        />
        <QuoteList
          title="급상승 Top 5"
          caption="하루 전보다 많이 오른 순"
          quotes={model.topRising}
          moreHref="/ranking?sort=rise&period=1D"
          emptyText="24시간치 기록이 쌓이면 보여드려요."
        />
      </div>
    </main>
  );
}
