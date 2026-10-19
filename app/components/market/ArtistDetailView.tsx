'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { changeRateOf, formatPoint, formatPrice, formatSignedNumber } from '../../../lib/market/format';
import type { ArtistDetailModel } from '../../../lib/market/queries';
import { DEFAULT_PERIOD, PERIODS } from '../../../lib/market/time';
import type { PeriodId } from '../../../lib/market/types';
import { ENABLED_VARIABLES, getVariable, type VariableId } from '../../../lib/market/variables';
import { ChangeAmount, PointDelta } from './Change';
import MultiLineChart, { type LineDefinition } from './MultiLineChart';
import PeriodTabs from './PeriodTabs';
import PriceChart from './PriceChart';

const VARIABLE_COLORS: Record<VariableId, string> = {
  musicAlbum: '#7c4dff',
  newsIssue: '#f59e0b',
  snsFandom: '#10b981',
  brandFit: '#ec4899',
  comebackActivity: '#06b6d4',
  growthMomentum: '#8b5cf6',
  riskAdjustment: '#64748b',
};

const GROUP_LABEL = { boy_group: '보이그룹', girl_group: '걸그룹', mixed: '혼성그룹' } as const;

export default function ArtistDetailView({ model }: { model: ArtistDetailModel }) {
  const { quote } = model;
  const [period, setPeriod] = useState<PeriodId>(DEFAULT_PERIOD);
  const [selected, setSelected] = useState<VariableId[]>(['musicAlbum', 'newsIssue', 'snsFandom']);

  const points = model.priceSeries[period];
  const start = points[0]?.value ?? quote.price;
  const rate = changeRateOf(quote.price, start);
  const periodLabel = PERIODS.find((item) => item.id === period)?.label ?? '';

  const variableLines: LineDefinition[] = selected.map((id) => ({
    key: id,
    label: getVariable(id).label,
    color: VARIABLE_COLORS[id],
  }));

  const variableData = useMemo(
    () => model.variableSeries[period] as unknown as Array<{ time: number } & Record<string, number>>,
    [model.variableSeries, period],
  );

  function toggleVariable(id: VariableId) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-fx-line bg-fx-surface p-6 lg:p-8" aria-labelledby="artist-name">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 id="artist-name" className="text-[28px] font-bold tracking-[-0.03em] text-fx-ink">
                {quote.koreanName}
              </h1>
              <span className="text-[15px] text-fx-sub">{quote.name}</span>
              <span className="rounded-md bg-fx-raised px-2 py-0.5 text-xs font-semibold text-fx-sub">
                {quote.ticker}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-fx-faint">
              {GROUP_LABEL[quote.groupType]}, 종합 {quote.rank}위 / {model.totalArtists}팀
            </p>
            <p className="fx-num mt-4 text-[40px] font-bold leading-none tracking-[-0.03em] text-fx-ink">
              {formatPrice(quote.price)}
            </p>
            <p className="mt-3 text-[15px]">
              <ChangeAmount amount={quote.price - start} rate={rate} className="font-semibold" />
              <span className="ml-2 text-fx-faint">{periodLabel} 전 대비</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <Link
              href={`/compare?ids=${quote.id}`}
              className="rounded-xl border border-fx-line px-4 py-2 text-sm font-semibold text-fx-ink transition-colors hover:bg-fx-raised"
            >
              다른 그룹과 비교
            </Link>
            <PeriodTabs value={period} onChange={setPeriod} />
          </div>
        </div>

        <div className="mt-6">
          <PriceChart points={points} period={period} height={340} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-fx-line bg-fx-line sm:grid-cols-4">
          {[
            { label: `${periodLabel} 최고`, value: formatPrice(model.periodHigh[period]) },
            { label: `${periodLabel} 최저`, value: formatPrice(model.periodLow[period]) },
            { label: 'FANDEX 점수', value: formatPoint(quote.score) },
            { label: '팬캡', value: Math.round(quote.fanCap).toLocaleString('ko-KR') },
          ].map((item) => (
            <div key={item.label} className="bg-fx-surface px-4 py-3">
              <dt className="text-xs text-fx-sub">{item.label}</dt>
              <dd className="fx-num mt-1 text-[15px] font-bold text-fx-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-2xl border border-fx-line bg-fx-surface p-6 lg:p-8" aria-labelledby="variables-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="variables-title" className="text-[19px] font-bold text-fx-ink">
            변수별 분석
          </h2>
          <p className="text-[13px] text-fx-sub">카드를 눌러 아래 차트에 겹쳐 보세요. 원점수는 0~100이에요.</p>
        </div>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {model.breakdown.map((item) => {
            const variable = getVariable(item.id);
            const active = selected.includes(item.id);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleVariable(item.id)}
                  className={`h-full w-full rounded-xl border p-4 text-left transition-colors ${
                    active ? 'border-fx-ink bg-fx-raised' : 'border-fx-line hover:border-fx-sub'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-fx-sub">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: active ? VARIABLE_COLORS[item.id] : 'var(--fx-line)' }}
                      aria-hidden="true"
                    />
                    {variable.label}
                  </span>
                  <span className="fx-num mt-2 block text-[24px] font-bold text-fx-ink">{formatPoint(item.raw)}</span>
                  <span className="mt-1 block text-xs text-fx-sub">
                    1주 <PointDelta delta={item.change1W} className="font-semibold" />
                  </span>
                  <span className="mt-3 block border-t border-fx-line pt-2 text-xs text-fx-faint">
                    가격 기여 <span className="fx-num font-semibold text-fx-sub">{formatSignedNumber(item.contribution, 1)}점</span>
                    <br />
                    {variable.penalty ? '낮은 순' : '전체'} {item.rank}위
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-6">
          {variableLines.length > 0 ? (
            <MultiLineChart
              data={variableData}
              lines={variableLines}
              period={period}
              height={280}
              formatValue={(value) => formatPoint(value)}
              domain={[0, 100]}
            />
          ) : (
            <p className="rounded-xl bg-fx-raised py-16 text-center text-sm text-fx-sub">
              위에서 변수를 하나 이상 골라 주세요.
            </p>
          )}
        </div>

        <ul className="mt-6 grid gap-x-8 gap-y-2 text-xs text-fx-sub md:grid-cols-2">
          {ENABLED_VARIABLES.map((variable) => (
            <li key={variable.id}>
              <span className="font-semibold text-fx-ink">{variable.label}</span> {variable.description}. 출처: {variable.source}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
