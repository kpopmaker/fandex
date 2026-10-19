import Link from 'next/link';
import type { NewsItem } from '../../../lib/market/queries';
import { ChangeRate } from './Change';

export default function NewsList({ items, isMock }: { items: NewsItem[]; isMock: boolean }) {
  return (
    <section className="rounded-2xl border border-fx-line bg-fx-surface" aria-labelledby="news-title">
      <div className="flex items-baseline justify-between px-5 pb-2 pt-5">
        <h2 id="news-title" className="text-[17px] font-bold text-fx-ink">
          주요 뉴스 Top 10
        </h2>
        <span className="text-xs text-fx-faint">최근 24시간 · 기사 많은 순</span>
      </div>
      {isMock && (
        <p className="px-5 text-xs text-fx-faint">
          네이버 뉴스가 연결되면 실제 기사 제목과 링크가 표시돼요.
        </p>
      )}
      <ol className="mt-2 pb-2">
        {items.map((item, index) => (
          <li key={item.artistId}>
            <Link
              href={`/artists/${item.artistId}`}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-fx-raised"
            >
              <span className="fx-num w-5 text-[15px] font-bold text-fx-brand">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[15px] text-fx-ink">{item.title}</span>
              <ChangeRate rate={item.change} className="shrink-0 text-xs font-medium" />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
