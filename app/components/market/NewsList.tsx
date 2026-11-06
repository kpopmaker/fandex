import Link from 'next/link';
import { formatRelative } from '../../../lib/market/format';
import type { NewsItem } from '../../../lib/market/queries';

export default function NewsList({ items }: { items: NewsItem[] }) {
  return (
    <section className="rounded-2xl border border-fx-line bg-fx-surface" aria-labelledby="news-title">
      <div className="flex items-baseline justify-between px-5 pb-2 pt-5">
        <h2 id="news-title" className="text-[17px] font-bold text-fx-ink">
          주요 뉴스 Top 10
        </h2>
        <span className="text-xs text-fx-faint">최근 24시간 기사 많은 그룹 순</span>
      </div>
      {items.length === 0 ? (
        <p className="px-5 pb-6 pt-2 text-sm text-fx-sub">아직 모인 기사가 없어요.</p>
      ) : (
        <ol className="mt-1 pb-2">
          {items.map((item, index) => (
            <li key={item.artistId} className="flex gap-3 px-5 py-2.5">
              <span className="fx-num w-5 shrink-0 pt-0.5 text-[15px] font-bold text-fx-brand">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 text-[13px]">
                  <Link href={`/artists/${item.artistId}`} className="font-semibold text-fx-ink hover:underline">
                    {item.artistName}
                  </Link>
                  <span className="fx-num text-fx-faint">기사 {item.count}건</span>
                </div>
                {item.headline && (
                  <a
                    href={item.headline.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block truncate text-[15px] text-fx-ink hover:underline"
                  >
                    {item.headline.title}
                    <span className="ml-2 text-xs text-fx-faint">{formatRelative(item.headline.publishedAt)}</span>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
