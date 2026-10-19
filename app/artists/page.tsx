import Link from 'next/link';
import DataNotice from '../components/market/DataNotice';
import { ChangeRate } from '../components/market/Change';
import { GROUP_TYPE_LABEL } from '../../lib/market/artists';
import { formatPrice } from '../../lib/market/format';
import { getDirectoryModel } from '../../lib/market/queries';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

export default async function ArtistsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q : '';
  const model = getDirectoryModel();
  const needle = normalize(query);
  const results = [...model.quotes]
    .filter((quote) =>
      !needle ||
      normalize(`${quote.id}${quote.name}${quote.koreanName}${quote.ticker}`).includes(needle),
    )
    .sort((a, b) => a.koreanName.localeCompare(b.koreanName, 'ko'));

  return (
    <main className="mx-auto max-w-[1280px] px-4 pb-16 pt-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-[-0.03em] text-fx-ink">아티스트</h1>
          <p className="mt-1 text-[15px] text-fx-sub">
            그룹을 검색해서 지수와 차트, 변수별 분석을 확인하세요.
          </p>
        </div>
        <DataNotice meta={model.meta} />
      </div>

      <form action="/artists" role="search" className="mt-5">
        <label className="flex h-14 items-center gap-3 rounded-2xl border border-fx-line bg-fx-surface px-5 focus-within:ring-2 focus-within:ring-fx-brand">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-fx-sub" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <span className="sr-only">그룹 검색</span>
          <input
            name="q"
            defaultValue={query}
            placeholder="그룹 이름이나 티커를 입력하세요 (예: 에스파, IVE, SKZ)"
            className="w-full bg-transparent text-[17px] text-fx-ink outline-none placeholder:text-fx-faint"
          />
          <button type="submit" className="shrink-0 rounded-xl bg-fx-brand px-4 py-2 text-sm font-bold text-white">
            검색
          </button>
        </label>
      </form>

      <p className="mt-6 text-sm text-fx-sub">
        {query ? (
          <>
            <span className="font-semibold text-fx-ink">‘{query}’</span> 검색 결과 {results.length}팀
          </>
        ) : (
          <>전체 {results.length}팀 · 가나다순</>
        )}
      </p>

      {results.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-fx-line bg-fx-surface px-6 py-14 text-center">
          <p className="text-[15px] font-semibold text-fx-ink">‘{query}’와 일치하는 그룹이 없어요.</p>
          <p className="mt-1 text-sm text-fx-sub">한글 이름, 영문 이름, 티커 중 하나로 다시 검색해 보세요.</p>
          <Link href="/artists" className="mt-4 inline-block text-sm font-semibold text-fx-brand">
            전체 그룹 보기
          </Link>
        </div>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((quote) => (
            <li key={quote.id}>
              <Link
                href={`/artists/${quote.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-fx-line bg-fx-surface px-5 py-4 transition-colors hover:border-fx-sub"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[16px] font-bold text-fx-ink">{quote.koreanName}</span>
                  <span className="mt-0.5 block truncate text-xs text-fx-faint">
                    {quote.name} · {GROUP_TYPE_LABEL[quote.groupType]}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="fx-num block text-[15px] font-semibold text-fx-ink">{formatPrice(quote.price)}</span>
                  <ChangeRate rate={quote.change['1D']} className="text-xs font-medium" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
