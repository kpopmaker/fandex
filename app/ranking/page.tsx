import DataNotice from '../components/market/DataNotice';
import RankingTable, {
  type RankingGroup,
  type RankingOrder,
  type RankingPeriod,
  type RankingSort,
  type RankingState,
} from '../components/market/RankingTable';
import { getRankingModel } from '../../lib/market/queries';
import { ENABLED_VARIABLES } from '../../lib/market/variables';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const SORTS: readonly string[] = ['overall', 'rise', 'fall', 'fancap', ...ENABLED_VARIABLES.map((v) => v.id)];

function pick<T extends string>(value: unknown, allowed: readonly string[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value) ? (value as T) : fallback;
}

export default async function RankingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const model = getRankingModel();

  const initial: RankingState = {
    sort: pick<RankingSort>(params.sort, SORTS, 'overall'),
    period: pick<RankingPeriod>(params.period, ['1D', '1W', '1M'], '1D'),
    order: pick<RankingOrder>(params.order, ['desc', 'asc'], 'desc'),
    group: pick<RankingGroup>(params.group, ['all', 'boy_group', 'girl_group'], 'all'),
  };

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-fx-ink">랭킹</h1>
          <p className="mt-1 text-[15px] text-fx-sub">
            K-pop 그룹 1위부터 100위까지, 원하는 기준으로 정렬해 보세요.
          </p>
        </div>
        <DataNotice meta={model.meta} />
      </div>
      <div className="mt-5">
        <RankingTable quotes={model.quotes} initial={initial} />
      </div>
    </main>
  );
}
