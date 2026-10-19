'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { formatPoint, formatPrice, formatSignedPercent } from '../../../lib/market/format';
import type { CompareModel } from '../../../lib/market/queries';
import { DEFAULT_PERIOD } from '../../../lib/market/time';
import type { PeriodId } from '../../../lib/market/types';
import { ENABLED_VARIABLES } from '../../../lib/market/variables';
import { ChangeRate } from './Change';
import MultiLineChart from './MultiLineChart';
import PeriodTabs from './PeriodTabs';

const SLOT_COLORS = ['#6527e8', '#e8762c', '#0f9d8a'];
const MAX = 3;

type Mode = 'return' | 'price';

export default function CompareView({ model }: { model: CompareModel }) {
  const router = useRouter();
  const [period, setPeriod] = useState<PeriodId>(DEFAULT_PERIOD);
  const [mode, setMode] = useState<Mode>('return');
  const [query, setQuery] = useState('');

  const ids = model.entries.map((entry) => entry.quote.id);
  const full = ids.length >= MAX;

  function navigate(nextIds: string[]) {
    router.push(nextIds.length ? `/compare?ids=${nextIds.join(',')}` : '/compare');
  }

  const suggestions = useMemo(() => {
    const needle = query.trim().toLowerCase().replace(/\s+/g, '');
    if (!needle) return [];
    return model.options
      .filter((option) => !ids.includes(option.id))
      .filter((option) =>
        `${option.id}${option.name}${option.koreanName}${option.ticker}`
          .toLowerCase()
          .replace(/\s+/g, '')
          .includes(needle),
      )
      .slice(0, 6);
  }, [query, model.options, ids]);

  const lines = model.entries.map((entry, index) => ({
    key: entry.quote.id,
    label: entry.quote.koreanName,
    color: SLOT_COLORS[index],
  }));

  const chartData = useMemo(() => {
    if (model.entries.length === 0) return [];
    const base = model.entries[0].priceSeries[period];
    return base.map((point, index) => {
      const row: { time: number } & Record<string, number> = { time: point.time };
      for (const entry of model.entries) {
        const series = entry.priceSeries[period];
        const value = series[index]?.value ?? series[series.length - 1].value;
        row[entry.quote.id] = mode === 'return' ? (value / series[0].value - 1) * 100 : value;
      }
      return row;
    });
  }, [model.entries, period, mode]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-fx-line bg-fx-surface p-6" aria-label="비교할 그룹 선택">
        <div className="flex flex-wrap items-center gap-2">
          {model.entries.map((entry, index) => (
            <span
              key={entry.quote.id}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-fx-line pl-3 pr-1.5 text-sm font-semibold text-fx-ink"
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: SLOT_COLORS[index] }} aria-hidden="true" />
              {entry.quote.koreanName}
              <button
                type="button"
                onClick={() => navigate(ids.filter((id) => id !== entry.quote.id))}
                aria-label={`${entry.quote.koreanName} 빼기`}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full text-fx-sub hover:bg-fx-raised hover:text-fx-ink"
              >
                ✕
              </button>
            </span>
          ))}

          {!full && (
            <div className="relative">
              <label className="flex h-10 w-64 items-center rounded-full bg-fx-raised px-4 focus-within:ring-2 focus-within:ring-fx-brand">
                <span className="sr-only">비교할 그룹 추가</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`그룹 추가 (${ids.length}/${MAX})`}
                  className="w-full bg-transparent text-sm text-fx-ink outline-none placeholder:text-fx-faint"
                />
              </label>
              {suggestions.length > 0 && (
                <ul className="absolute left-0 top-12 z-10 w-64 overflow-hidden rounded-xl border border-fx-line bg-fx-surface py-1 shadow-xl">
                  {suggestions.map((option) => (
                    <li key={option.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('');
                          navigate([...ids, option.id]);
                        }}
                        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-fx-raised"
                      >
                        <span className="font-semibold text-fx-ink">{option.koreanName}</span>
                        <span className="text-xs text-fx-faint">{option.ticker}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {full && <span className="text-[13px] text-fx-sub">최대 3팀까지 비교할 수 있어요.</span>}
        </div>
      </section>

      {model.entries.length === 0 ? (
        <section className="rounded-2xl border border-fx-line bg-fx-surface px-6 py-16 text-center">
          <p className="text-[15px] font-semibold text-fx-ink">비교할 그룹을 추가해 주세요.</p>
          <p className="mt-1 text-sm text-fx-sub">위 입력창에 그룹 이름을 입력하면 최대 3팀까지 나란히 볼 수 있어요.</p>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-fx-line bg-fx-surface p-6" aria-label="비교 차트">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div role="radiogroup" aria-label="차트 단위" className="inline-flex rounded-xl bg-fx-raised p-1">
                {(
                  [
                    ['return', '수익률'],
                    ['price', '가격'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={mode === id}
                    onClick={() => setMode(id)}
                    className={`rounded-lg px-3 py-1.5 text-[13px] ${
                      mode === id
                        ? 'bg-fx-surface font-bold text-fx-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                        : 'font-medium text-fx-sub'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <PeriodTabs value={period} onChange={setPeriod} />
            </div>
            <div className="mt-5">
              <MultiLineChart
                data={chartData}
                lines={lines}
                period={period}
                height={340}
                referenceY={mode === 'return' ? 0 : undefined}
                formatValue={(value) =>
                  mode === 'return' ? formatSignedPercent(value / 100) : formatPrice(value)
                }
              />
            </div>
          </section>

          <section className="overflow-x-auto rounded-2xl border border-fx-line bg-fx-surface" aria-label="지표 비교">
            <table className="w-full min-w-[640px] text-[14px]">
              <thead>
                <tr className="border-b border-fx-line text-left text-xs font-semibold text-fx-sub">
                  <th scope="col" className="px-5 py-3">지표</th>
                  {model.entries.map((entry, index) => (
                    <th key={entry.quote.id} scope="col" className="px-5 py-3 text-right">
                      <Link href={`/artists/${entry.quote.id}`} className="inline-flex items-center gap-1.5 text-fx-ink hover:underline">
                        <span className="h-2 w-2 rounded-full" style={{ background: SLOT_COLORS[index] }} aria-hidden="true" />
                        {entry.quote.koreanName}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-fx-line">
                  <th scope="row" className="px-5 py-3 text-left font-medium text-fx-sub">가격</th>
                  {model.entries.map((entry) => (
                    <td key={entry.quote.id} className="fx-num px-5 py-3 text-right font-bold text-fx-ink">
                      {formatPrice(entry.quote.price)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-fx-line">
                  <th scope="row" className="px-5 py-3 text-left font-medium text-fx-sub">1일 등락률</th>
                  {model.entries.map((entry) => (
                    <td key={entry.quote.id} className="px-5 py-3 text-right font-semibold">
                      <ChangeRate rate={entry.quote.change['1D']} />
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-fx-line">
                  <th scope="row" className="px-5 py-3 text-left font-medium text-fx-sub">종합 순위</th>
                  {model.entries.map((entry) => (
                    <td key={entry.quote.id} className="fx-num px-5 py-3 text-right text-fx-ink">
                      {entry.quote.rank}위
                    </td>
                  ))}
                </tr>
                {ENABLED_VARIABLES.map((variable) => {
                  const values = model.entries.map((entry) => entry.quote.raw[variable.id]);
                  const best = variable.penalty ? Math.min(...values) : Math.max(...values);
                  return (
                    <tr key={variable.id} className="border-b border-fx-line last:border-0">
                      <th scope="row" className="px-5 py-3 text-left font-medium text-fx-sub">{variable.label}</th>
                      {model.entries.map((entry, index) => {
                        const value = entry.quote.raw[variable.id];
                        const isBest = model.entries.length > 1 && value === best;
                        return (
                          <td key={entry.quote.id} className="px-5 py-3">
                            <div className="flex items-center justify-end gap-3">
                              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-fx-raised" aria-hidden="true">
                                <span
                                  className="block h-full rounded-full"
                                  style={{ width: `${value}%`, background: SLOT_COLORS[index] }}
                                />
                              </span>
                              <span className={`fx-num w-10 text-right ${isBest ? 'font-bold text-fx-ink' : 'text-fx-sub'}`}>
                                {formatPoint(value)}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}
