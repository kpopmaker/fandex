import { formatAsOf } from '../../../lib/market/format';
import type { MarketMeta } from '../../../lib/market/queries';

export default function DataNotice({ meta }: { meta: MarketMeta }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fx-sub">
      <span className="fx-num">{formatAsOf(meta.asOf)}</span>
      <span aria-hidden="true" className="h-3 w-px bg-fx-line" />
      <span>15분마다 갱신</span>
      {meta.dataKind === 'mock' && (
        <>
          <span aria-hidden="true" className="h-3 w-px bg-fx-line" />
          <span className="rounded-md bg-fx-brand-soft px-2 py-0.5 font-semibold text-fx-brand">
            예시 데이터로 표시 중
          </span>
        </>
      )}
    </div>
  );
}
