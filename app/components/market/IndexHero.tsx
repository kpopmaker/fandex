'use client';

import { useState } from 'react';
import { changeRateOf, formatFanCap, formatIndex } from '../../../lib/market/format';
import { DEFAULT_PERIOD, PERIODS } from '../../../lib/market/time';
import type { PeriodId, SeriesPoint } from '../../../lib/market/types';
import { ChangeAmount } from './Change';
import PeriodTabs from './PeriodTabs';
import PriceChart from './PriceChart';

type Props = {
  value: number;
  series: Record<PeriodId, SeriesPoint[]>;
  advancers: number;
  decliners: number;
  artistCount: number;
  totalFanCap: number;
};

export default function IndexHero({
  value,
  series,
  advancers,
  decliners,
  artistCount,
  totalFanCap,
}: Props) {
  const [period, setPeriod] = useState<PeriodId>(DEFAULT_PERIOD);
  const points = series[period];
  const start = points[0]?.value ?? value;
  const rate = changeRateOf(value, start);
  const unchanged = Math.max(0, artistCount - advancers - decliners);
  const periodLabel = PERIODS.find((item) => item.id === period)?.label ?? '';

  return (
    <section aria-labelledby="kmi-title" className="grid gap-px overflow-hidden rounded-2xl border border-fx-line bg-fx-line lg:grid-cols-[1fr_300px]">
      <div className="bg-fx-surface p-6 lg:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 id="kmi-title" className="text-[15px] font-semibold text-fx-sub">
              K-pop 종합지수 <span className="font-medium text-fx-faint">KMI</span>
            </h1>
            <p className="fx-num mt-1 text-[44px] font-bold leading-none tracking-[-0.03em] text-fx-ink">
              {formatIndex(value)}
            </p>
            <p className="mt-3 text-[15px]">
              <ChangeAmount amount={value - start} rate={rate} className="font-semibold" />
              <span className="ml-2 text-fx-faint">{periodLabel} 전 대비</span>
            </p>
          </div>
          <PeriodTabs value={period} onChange={setPeriod} />
        </div>
        <div className="mt-6">
          <PriceChart points={points} period={period} height={340} valueLabel="KMI" />
        </div>
      </div>

      <aside className="flex flex-col bg-fx-surface p-6" aria-label="오늘의 시장 요약">
        <h2 className="text-[15px] font-bold text-fx-ink">오늘의 시장</h2>
        <dl className="mt-5 space-y-5">
          <div>
            <dt className="text-[13px] text-fx-sub">상승·하락 그룹</dt>
            <dd className="mt-2">
              <div className="flex h-2 overflow-hidden rounded-full bg-fx-raised">
                <span className="bg-fx-up" style={{ width: `${(advancers / artistCount) * 100}%` }} />
                <span className="bg-fx-faint/40" style={{ width: `${(unchanged / artistCount) * 100}%` }} />
                <span className="bg-fx-down" style={{ width: `${(decliners / artistCount) * 100}%` }} />
              </div>
              <div className="fx-num mt-2 flex justify-between text-sm font-semibold">
                <span className="text-fx-up">상승 {advancers}</span>
                <span className="text-fx-down">하락 {decliners}</span>
              </div>
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-t border-fx-line pt-5">
            <dt className="text-[13px] text-fx-sub">추적 그룹</dt>
            <dd className="fx-num text-[15px] font-bold text-fx-ink">{artistCount}팀</dd>
          </div>
          <div className="flex items-baseline justify-between">
            <dt className="text-[13px] text-fx-sub">전체 팬캡</dt>
            <dd className="fx-num text-[15px] font-bold text-fx-ink">{formatFanCap(totalFanCap)}</dd>
          </div>
        </dl>
        <p className="mt-auto pt-6 text-xs leading-relaxed text-fx-faint">
          KMI는 모든 그룹의 팬캡(가격 × 팬덤 규모)을 더한 시가총액식 지수예요. 2026년 1월 1일을 1,000으로 놓고 계산해요.
        </p>
      </aside>
    </section>
  );
}
