'use client';

import Link from 'next/link';
import { Fragment, useMemo, useState } from 'react';
import {
  changeRateOf,
  comparisonLabel,
  formatDate,
  formatPoint,
  formatPrice,
  formatRelative,
  formatSignedNumber,
} from '../../../lib/market/format';
import type { VariableDetail } from '../../../lib/market/explain';
import type { ArtistDetailModel, MusicHistoryModel } from '../../../lib/market/queries';
import { DEFAULT_PERIOD, getPeriod } from '../../../lib/market/time';
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

const GROUP_LABEL = {
  boy_group: '보이그룹',
  girl_group: '걸그룹',
  mixed: '혼성그룹',
  unknown: '그룹',
} as const;

export default function ArtistDetailView({ model }: { model: ArtistDetailModel }) {
  const { quote } = model;
  const [period, setPeriod] = useState<PeriodId>(DEFAULT_PERIOD);
  const [selected, setSelected] = useState<VariableId[]>(['musicAlbum', 'newsIssue', 'snsFandom']);
  const [expanded, setExpanded] = useState<VariableId | null>(null);

  const points = model.priceSeries[period];
  const first = points[0];
  const last = points[points.length - 1];
  const start = first?.value ?? quote.price;
  const rate = changeRateOf(quote.price, start);
  const definition = getPeriod(period);
  const label = first && last ? comparisonLabel(first.time, last.time, definition.span, definition.label) : '';
  const values = points.map((point) => point.value);
  const high = values.length ? Math.max(...values) : quote.price;
  const low = values.length ? Math.min(...values) : quote.price;

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
              {points.length > 1 ? (
                <>
                  <ChangeAmount amount={quote.price - start} rate={rate} className="font-semibold" />
                  <span className="ml-2 text-fx-faint">{label}</span>
                </>
              ) : (
                <span className="text-fx-faint">첫 기록이에요</span>
              )}
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
          <PriceChart points={points} height={340} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-fx-line bg-fx-line sm:grid-cols-4">
          {[
            { label: '차트 구간 최고', value: formatPrice(high) },
            { label: '차트 구간 최저', value: formatPrice(low) },
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
          <p className="text-[13px] text-fx-sub">
            카드를 눌러 아래 차트에 겹쳐 보세요. 원점수는 기준치를 100점으로 둔 점수라 100점을 넘을 수 있어요.
          </p>
        </div>

        <ul className="mt-5 grid grid-flow-row-dense gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {model.breakdown.map((item) => {
            const variable = getVariable(item.id);
            const active = selected.includes(item.id);
            const open = expanded === item.id;
            return (
              <Fragment key={item.id}>
                <li
                  className={`flex flex-col overflow-hidden rounded-xl border transition-colors ${
                    active ? 'border-fx-ink bg-fx-raised' : 'border-fx-line hover:border-fx-sub'
                  }`}
                >
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleVariable(item.id)}
                    className="w-full flex-1 p-4 text-left"
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
                    <span className="mt-1 block text-xs text-fx-sub">{item.basis}</span>
                    <span className="mt-3 block border-t border-fx-line pt-2 text-xs text-fx-faint">
                      1주 변화 <PointDelta delta={item.change1W} className="font-semibold" />
                      <br />
                      가격 기여{' '}
                      <span className="fx-num font-semibold text-fx-sub">{formatSignedNumber(item.contribution, 1)}점</span>
                      <br />
                      {variable.penalty ? '낮은 순' : '전체'} {item.rank}위
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`detail-${item.id}`}
                    onClick={() => setExpanded(open ? null : item.id)}
                    className={`flex w-full items-center justify-center gap-1 border-t border-fx-line py-2 text-xs font-semibold transition-colors ${
                      open ? 'bg-fx-ink text-fx-surface' : 'text-fx-sub hover:bg-fx-raised hover:text-fx-ink'
                    }`}
                  >
                    {open ? '접기' : '더보기'}
                    <svg viewBox="0 0 20 20" className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="m5 8 5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </li>
                {open && (
                  <li id={`detail-${item.id}`} className="col-span-full">
                    <VariableDetailPanel label={variable.label} detail={item.detail} />
                  </li>
                )}
              </Fragment>
            );
          })}
        </ul>

        <div className="mt-6">
          {variableLines.length > 0 ? (
            <MultiLineChart
              data={variableData}
              lines={variableLines}
              height={280}
              formatValue={(value) => formatPoint(value)}
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

      {model.musicHistory && <MusicHistorySection history={model.musicHistory} debutAt={model.debutAt} />}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-2xl border border-fx-line bg-fx-surface p-6" aria-labelledby="headlines-title">
          <h2 id="headlines-title" className="text-[17px] font-bold text-fx-ink">최근 24시간 뉴스</h2>
          {model.headlines.length === 0 ? (
            <p className="mt-3 text-sm text-fx-sub">최근 24시간 동안 관련 기사가 없어요.</p>
          ) : (
            <ul className="mt-3 divide-y divide-fx-line">
              {model.headlines.map((headline) => (
                <li key={headline.url} className="py-2.5">
                  <a href={headline.url} target="_blank" rel="noreferrer" className="text-[15px] text-fx-ink hover:underline">
                    {headline.title}
                  </a>
                  <span className="ml-2 text-xs text-fx-faint">{formatRelative(headline.publishedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-fx-line bg-fx-surface p-6" aria-labelledby="chart-title">
          <h2 id="chart-title" className="text-[17px] font-bold text-fx-ink">멜론 TOP100</h2>
          {model.chartTracks.length === 0 ? (
            <p className="mt-3 text-sm text-fx-sub">지금 TOP100에 든 곡이 없어요.</p>
          ) : (
            <ol className="mt-3 space-y-2">
              {model.chartTracks.map((track) => (
                <li key={`${track.rank}-${track.title}`} className="flex items-baseline gap-3 text-[15px]">
                  <span className="fx-num w-10 shrink-0 font-bold text-fx-brand">{track.rank}위</span>
                  <span className="truncate text-fx-ink">{track.title}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function VariableDetailPanel({ label, detail }: { label: string; detail: VariableDetail }) {
  return (
    <div className="rounded-xl border border-fx-line bg-fx-raised p-5">
      <p className="text-xs font-semibold text-fx-sub">{label} · 왜 이렇게 움직였나요?</p>
      <p className="mt-2 text-[15px] font-semibold leading-relaxed text-fx-ink">{detail.summary}</p>
      <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-fx-sub">
        {detail.lines.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-fx-faint" />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      {detail.itemsTitle && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-fx-sub">{detail.itemsTitle}</p>
          {detail.items.length === 0 ? (
            <p className="mt-1.5 text-[13px] text-fx-faint">해당하는 기사·곡이 없어요.</p>
          ) : (
            <ul className="mt-1.5 divide-y divide-fx-line rounded-lg border border-fx-line bg-fx-surface">
              {detail.items.map((item) => (
                <li key={`${item.title}-${item.meta}`} className="flex items-baseline justify-between gap-3 px-3 py-2 text-[13px]">
                  {item.url ? (
                    <a href={item.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-fx-ink hover:underline">
                      {item.title}
                    </a>
                  ) : (
                    <span className="min-w-0 truncate text-fx-ink">{item.title}</span>
                  )}
                  {item.meta && <span className="fx-num shrink-0 text-xs text-fx-faint">{item.meta}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {detail.note && <p className="mt-3 text-xs text-fx-faint">{detail.note}</p>}
    </div>
  );
}

const HISTORY_RANGES = [
  { id: '1Y', label: '1년', years: 1 },
  { id: '5Y', label: '5년', years: 5 },
  { id: 'ALL', label: '데뷔부터', years: null },
] as const;

function MusicHistorySection({ history, debutAt }: { history: MusicHistoryModel; debutAt: number | null }) {
  const [range, setRange] = useState<(typeof HISTORY_RANGES)[number]['id']>('ALL');
  const years = HISTORY_RANGES.find((item) => item.id === range)?.years ?? null;
  const weekly = history.unit === 'week';
  const line: LineDefinition[] = [
    { key: 'value', label: weekly ? '주간 차트 점수' : '하루 평균 차트 점수', color: '#7c4dff' },
  ];
  const data = useMemo(() => {
    const last = history.points[history.points.length - 1]?.time ?? 0;
    const from = years === null ? -Infinity : last - years * 365.25 * 86_400_000;
    return history.points.filter((point) => point.time >= from) as unknown as Array<{ time: number } & Record<string, number>>;
  }, [history.points, years]);
  const weekSuffix = weekly ? ' 주' : '';

  const stats = [
    { label: '처음 차트인', value: history.firstChart ? `${formatDate(history.firstChart)}${weekSuffix}` : '기록 없음' },
    {
      label: '최고 순위',
      value: history.best ? `${history.best.rank}위` : '—',
      sub: history.best ? `${history.best.title} · ${formatDate(history.best.date)}${weekSuffix}` : undefined,
    },
    {
      label: weekly ? '차트에 든 주' : '차트에 든 날',
      value: `${history.chartDays.toLocaleString('ko-KR')}${weekly ? '주' : '일'}`,
    },
    { label: debutAt ? '데뷔' : '기록 시작', value: formatDate(debutAt ?? history.from) },
  ];

  return (
    <section className="rounded-2xl border border-fx-line bg-fx-surface p-6 lg:p-8" aria-labelledby="music-history-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="music-history-title" className="text-[19px] font-bold text-fx-ink">
            음원 차트 기록
          </h2>
          <p className="mt-1 text-[13px] text-fx-sub">
            {history.source} 기준, {weekly ? '주마다 차트 점수' : '주마다 하루 평균 차트 점수'}(1위 100점 … 100위 1점, 여러 곡이면 합)
          </p>
        </div>
        <div className="flex rounded-xl bg-fx-raised p-1" role="tablist" aria-label="기간">
          {HISTORY_RANGES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={range === item.id}
              onClick={() => setRange(item.id)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                range === item.id ? 'bg-fx-surface text-fx-ink shadow-sm' : 'text-fx-sub hover:text-fx-ink'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <MultiLineChart
          data={data}
          lines={line}
          height={260}
          formatValue={(value) => value.toFixed(0)}
          formatTooltipTime={(time) => `${formatDate(time)} 주`}
          domain={[0, 'auto']}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-fx-line bg-fx-line sm:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="bg-fx-surface px-4 py-3">
            <dt className="text-xs text-fx-sub">{item.label}</dt>
            <dd className="fx-num mt-1 text-[15px] font-bold text-fx-ink">{item.value}</dd>
            {item.sub && <dd className="mt-0.5 truncate text-xs text-fx-faint">{item.sub}</dd>}
          </div>
        ))}
      </dl>

      <p className="mt-3 text-xs text-fx-faint">
        {weekly
          ? `멜론은 지난 주간 차트를 ${formatDate(history.archiveFrom)} 주부터만 주고 지난 일간 차트는 주지 않아, 장기 기록은 주간 차트로 만들었어요(${formatDate(history.archiveFrom)}~${formatDate(history.archiveTo)}).`
          : `장기 기록은 ${history.source}로 만들었어요(${formatDate(history.archiveFrom)}~${formatDate(history.archiveTo)}).`}
        {history.startsAfterDebut && ' 데뷔가 그보다 이르면 그 이전 구간은 비어 있어요.'} FANDEX 가격과 뉴스·팬덤 변수는 이보다 짧은
        기간만 있어요.
      </p>
    </section>
  );
}
