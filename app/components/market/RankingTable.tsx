'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { formatFanCap, formatPoint, formatPrice } from '../../../lib/market/format';
import type { ArtistQuote } from '../../../lib/market/queries';
import { ENABLED_VARIABLES, type VariableId } from '../../../lib/market/variables';
import { ChangeRate } from './Change';

export type RankingSort = 'overall' | 'rise' | 'fall' | 'fancap' | VariableId;
export type RankingPeriod = '1D' | '1W' | '1M';
export type RankingGroup = 'all' | 'boy_group' | 'girl_group' | 'mixed';
export type RankingOrder = 'desc' | 'asc';
export type RankingGeneration = 'all' | '1' | '2' | '3' | '4' | '5';

export type RankingState = {
  sort: RankingSort;
  period: RankingPeriod;
  order: RankingOrder;
  group: RankingGroup;
  gen: RankingGeneration;
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
  { id: 'all', label: '전체 그룹' },
  { id: 'boy_group', label: '보이그룹' },
  { id: 'girl_group', label: '걸그룹' },
  { id: 'mixed', label: '혼성그룹' },
];

const GENERATION_OPTIONS: { id: RankingGeneration; label: string }[] = [
  { id: 'all', label: '전체 세대' },
  { id: '1', label: '1세대 (~2002 데뷔)' },
  { id: '2', label: '2세대 (2003~2011)' },
  { id: '3', label: '3세대 (2012~2017)' },
  { id: '4', label: '4세대 (2018~2022)' },
  { id: '5', label: '5세대 (2023~)' },
];

const ORDER_OPTIONS: { id: RankingOrder; label: string }[] = [
  { id: 'desc', label: '내림차순' },
  { id: 'asc', label: '오름차순' },
];

function sortValue(quote: ArtistQuote, state: RankingState): number | null {
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

function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-semibold text-fx-sub">{label}</span>
      <span className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="h-10 w-full cursor-pointer appearance-none rounded-xl border border-fx-line bg-fx-surface pl-3.5 pr-9 text-sm font-semibold text-fx-ink transition-colors hover:border-fx-sub"
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fx-sub"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
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
      gen: next.gen,
    });
    window.history.replaceState(null, '', `/ranking?${params.toString()}`);
  }

  const rows = useMemo(() => {
    const filtered = quotes.filter(
      (quote) =>
        (state.group === 'all' || quote.groupType === state.group) &&
        (state.gen === 'all' || String(quote.generation) === state.gen),
    );
    const descending = naturalDescending(state.sort) === (state.order === 'desc');
    return [...filtered]
      .sort((a, b) => {
        const left = sortValue(a, state);
        const right = sortValue(b, state);
        // 비교할 기록이 없는 그룹은 항상 맨 뒤로
        if (left === null || right === null) return left === null ? (right === null ? 0 : 1) : -1;
        const diff = left - right;
        return descending ? -diff : diff;
      })
      .slice(0, 100);
  }, [quotes, state]);

  const periodLabel = PERIOD_OPTIONS.find((option) => option.id === state.period)?.label;

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-fx-line bg-fx-surface p-5 sm:grid-cols-3 lg:grid-cols-5">
        <Dropdown
          label="기준"
          value={state.sort}
          options={SORT_OPTIONS}
          onChange={(sort) => update({ sort })}
        />
        <Dropdown label="기간" value={state.period} options={PERIOD_OPTIONS} onChange={(period) => update({ period })} />
        <Dropdown label="그룹" value={state.group} options={GROUP_OPTIONS} onChange={(group) => update({ group })} />
        <Dropdown label="세대" value={state.gen} options={GENERATION_OPTIONS} onChange={(gen) => update({ gen })} />
        <Dropdown label="순서" value={state.order} options={ORDER_OPTIONS} onChange={(order) => update({ order })} />
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-fx-line bg-fx-surface">
        <table className="w-full min-w-[960px] text-[14px]">
          <caption className="sr-only">FANDEX 그룹 랭킹</caption>
          <thead>
            <tr className="border-b border-fx-line text-left text-xs font-semibold text-fx-sub">
              <th scope="col" className="w-16 whitespace-nowrap px-5 py-3 text-center">순위</th>
              <th scope="col" className="px-3 py-3">그룹</th>
              <th scope="col" className="px-3 py-3">세대</th>
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
                  {/* 표가 다시 정렬될 때마다 100개 링크를 미리 받지 않게(서버가 느려져 새로고침처럼 느껴졌다) */}
                  <Link href={`/artists/${quote.id}`} prefetch={false} className="group block">
                    <span className="font-semibold text-fx-ink group-hover:underline">{quote.koreanName}</span>
                    <span className="ml-2 text-xs text-fx-faint">{quote.ticker}</span>
                  </Link>
                </td>
                <td className="px-3 py-3 text-xs text-fx-sub" title={quote.debutYear ? `${quote.debutYear}년 데뷔` : undefined}>
                  {quote.generation ? `${quote.generation}세대` : '—'}
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
        {rows.length > 0 && (state.sort === 'rise' || state.sort === 'fall') && rows.every((row) => row.change[state.period] === null) && (
          <p className="border-t border-fx-line px-5 py-4 text-center text-sm text-fx-sub">
            {periodLabel}치 기록이 쌓이면 등락률 순위가 나와요. 지금은 가격 순으로 보여드려요.
          </p>
        )}
        {rows.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-fx-sub">조건에 맞는 그룹이 없어요. 그룹이나 세대를 전체로 바꿔 보세요.</p>
        )}
      </div>
    </div>
  );
}
