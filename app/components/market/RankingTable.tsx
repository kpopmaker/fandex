'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatFanCap, formatPoint, formatPrice } from '../../../lib/market/format';
import type { ArtistQuote } from '../../../lib/market/queries';
import { ENABLED_VARIABLES, type VariableId } from '../../../lib/market/variables';
import { ChangeRate } from './Change';

export type RankingSort = 'overall' | 'rise' | 'fall' | 'fancap' | VariableId;
export type RankingPeriod = '1D' | '1W' | '1M';
export type RankingGroup = 'all' | 'boy_group' | 'girl_group';
export type RankingOrder = 'desc' | 'asc';

export type RankingState = {
  sort: RankingSort;
  period: RankingPeriod;
  order: RankingOrder;
  group: RankingGroup;
};

const SORT_OPTIONS: { id: RankingSort; label: string }[] = [
  { id: 'overall', label: '종합' },
  { id: 'rise', label: '급상승' },
  { id: 'fall', label: '급하락' },
  { id: 'fancap', label: '팬캡' },
  ...ENABLED_VARIABLES.map((variable) => ({ id: variable.id as RankingSort, label: variable.label })),
];

const PERIOD_OPTIONS: { id: RankingPeriod; label: string }[] = [
  { id: '1D', label: '1일' },
  { id: '1W', label: '1주' },
  { id: '1M', label: '1달' },
];

const GROUP_OPTIONS: { id: RankingGroup; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'boy_group', label: '보이그룹' },
  { id: 'girl_group', label: '걸그룹' },
];

function sortValue(quote: ArtistQuote, state: RankingState): number {
  switch (state.sort) {
    case 'overall':
      return quote.price;
    case 'rise':
    case 'fall':
      return quote.change[state.period];
    case 'fancap':
      return quote.fanCap;
    default:
      return quote.raw[state.sort];
  }
}

/** 각 기준의 "기본" 정렬 방향. 급하락은 하락률이 큰 순이 기본. */
function naturalDescending(sort: RankingSort): boolean {
  return sort !== 'fall';
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-9 shrink-0 rounded-full border px-3.5 text-[13px] transition-colors ${
        selected
          ? 'border-fx-ink bg-fx-ink font-bold text-fx-surface'
          : 'border-fx-line bg-fx-surface font-medium text-fx-sub hover:border-fx-sub hover:text-fx-ink'
      }`}
    >
      {children}
    </button>
  );
}

export default function RankingTable({
  quotes,
  initial,
}: {
  quotes: ArtistQuote[];
  initial: RankingState;
}) {
  const [state, setState] = useState<RankingState>(initial);

  function update(patch: Partial<RankingState>) {
    const next = { ...state, ...patch };
    setState(next);
    const params = new URLSearchParams({
      sort: next.sort,
      period: next.period,
      order: next.order,
      group: next.group,
    });
    window.history.replaceState(null, '', `/ranking?${params.toString()}`);
  }

  const rows = useMemo(() => {
    const filtered = quotes.filter(
      (quote) => state.group === 'all' || quote.groupType === state.group,
    );
    const descending = naturalDescending(state.sort) === (state.order === 'desc');
    return [...filtered]
      .sort((a, b) => {
        const diff = sortValue(a, state) - sortValue(b, state);
        return descending ? -diff : diff;
      })
      .slice(0, 100);
  }, [quotes, state]);

  const periodLabel = PERIOD_OPTIONS.find((option) => option.id === state.period)?.label;

  return (
    <div>
      <div className="space-y-3 rounded-2xl border border-fx-line bg-fx-surface p-5">
        <div className="flex items-start gap-4">
          <span className="w-14 shrink-0 pt-2 text-[13px] font-semibold text-fx-sub">기준</span>
          <div className="flex flex-wrap gap-2">
            {SORT_OPTIONS.map((option) => (
              <Chip
                key={option.id}
                selected={state.sort === option.id}
                onClick={() => update({ sort: option.id, order: 'desc' })}
              >
                {option.label}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
          <div className="flex items-center gap-4">
            <span className="w-14 shrink-0 text-[13px] font-semibold text-fx-sub">기간</span>
            <div className="flex gap-2">
              {PERIOD_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  selected={state.period === option.id}
                  onClick={() => update({ period: option.id })}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="shrink-0 text-[13px] font-semibold text-fx-sub">그룹</span>
            <div className="flex gap-2">
              {GROUP_OPTIONS.map((option) => (
                <Chip
                  key={option.id}
                  selected={state.group === option.id}
                  onClick={() => update({ group: option.id })}
                >
                  {option.label}
                </Chip>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="shrink-0 text-[13px] font-semibold text-fx-sub">순서</span>
            <div className="flex gap-2">
              <Chip selected={state.order === 'desc'} onClick={() => update({ order: 'desc' })}>
                내림차순
              </Chip>
              <Chip selected={state.order === 'asc'} onClick={() => update({ order: 'asc' })}>
                오름차순
              </Chip>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-fx-line bg-fx-surface">
        <table className="w-full min-w-[960px] text-[14px]">
          <caption className="sr-only">FANDEX 그룹 랭킹</caption>
          <thead>
            <tr className="border-b border-fx-line text-left text-xs font-semibold text-fx-sub">
              <th scope="col" className="w-14 px-5 py-3 text-center">순위</th>
              <th scope="col" className="px-3 py-3">그룹</th>
              <th scope="col" className="px-3 py-3 text-right">가격</th>
              <th scope="col" className="px-3 py-3 text-right">{periodLabel} 등락률</th>
              <th scope="col" className="px-3 py-3 text-right">팬캡</th>
              {ENABLED_VARIABLES.map((variable) => (
                <th
                  key={variable.id}
                  scope="col"
                  className={`px-3 py-3 text-right ${state.sort === variable.id ? 'text-fx-ink' : ''}`}
                  title={variable.label}
                >
                  {variable.shortLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((quote, index) => (
              <tr key={quote.id} className="border-b border-fx-line last:border-0 hover:bg-fx-raised">
                <td className="fx-num px-5 py-3 text-center font-bold text-fx-ink">{index + 1}</td>
                <td className="px-3 py-3">
                  <Link href={`/artists/${quote.id}`} className="group block">
                    <span className="font-semibold text-fx-ink group-hover:underline">{quote.koreanName}</span>
                    <span className="ml-2 text-xs text-fx-faint">{quote.ticker}</span>
                  </Link>
                </td>
                <td className="fx-num px-3 py-3 text-right font-semibold text-fx-ink">
                  {formatPrice(quote.price)}
                </td>
                <td className="px-3 py-3 text-right font-medium">
                  <ChangeRate rate={quote.change[state.period]} />
                </td>
                <td className="fx-num px-3 py-3 text-right text-fx-sub">{formatFanCap(quote.fanCap)}</td>
                {ENABLED_VARIABLES.map((variable) => (
                  <td
                    key={variable.id}
                    className={`fx-num px-3 py-3 text-right ${
                      state.sort === variable.id ? 'font-bold text-fx-ink' : 'text-fx-sub'
                    }`}
                  >
                    {formatPoint(quote.raw[variable.id])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-fx-sub">조건에 맞는 그룹이 없어요. 그룹 필터를 전체로 바꿔 보세요.</p>
        )}
      </div>
    </div>
  );
}
