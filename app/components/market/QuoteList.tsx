import Link from 'next/link';
import { formatPrice } from '../../../lib/market/format';
import type { SparkQuote } from '../../../lib/market/queries';
import { ChangeRate } from './Change';
import Sparkline from './Sparkline';

export default function QuoteList({
  title,
  quotes,
  moreHref,
  caption,
}: {
  title: string;
  quotes: SparkQuote[];
  moreHref: string;
  caption: string;
}) {
  return (
    <section className="rounded-2xl border border-fx-line bg-fx-surface" aria-label={title}>
      <div className="flex items-baseline justify-between px-5 pb-2 pt-5">
        <h2 className="text-[17px] font-bold text-fx-ink">{title}</h2>
        <Link href={moreHref} className="text-[13px] font-medium text-fx-sub hover:text-fx-ink">
          전체 보기
        </Link>
      </div>
      <p className="px-5 text-xs text-fx-faint">{caption}</p>
      <ol className="mt-2 pb-2">
        {quotes.map((quote, index) => (
          <li key={quote.id}>
            <Link
              href={`/artists/${quote.id}`}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-fx-raised"
            >
              <span className="fx-num w-4 text-[15px] font-bold text-fx-brand">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-fx-ink">
                  {quote.koreanName}
                </span>
                <span className="block text-xs text-fx-faint">{quote.ticker}</span>
              </span>
              <Sparkline values={quote.spark} />
              <span className="w-[76px] text-right">
                <span className="fx-num block text-[15px] font-semibold text-fx-ink">
                  {formatPrice(quote.price)}
                </span>
                <ChangeRate rate={quote.change['1D']} className="block text-xs font-medium" />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
