import CompareView from '../components/market/CompareView';
import DataNotice from '../components/market/DataNotice';
import { getCompareModel } from '../../lib/market/queries';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ComparePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const raw = typeof params.ids === 'string' ? params.ids : '';
  const model = getCompareModel(raw.split(',').map((id) => id.trim()).filter(Boolean));

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-fx-ink">비교</h1>
          <p className="mt-1 text-[15px] text-fx-sub">최대 3팀의 지수 흐름과 변수를 나란히 비교해요.</p>
        </div>
        <DataNotice meta={model.meta} />
      </div>
      <div className="mt-5">
        <CompareView model={model} />
      </div>
    </main>
  );
}
