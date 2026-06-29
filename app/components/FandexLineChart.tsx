'use client';

import { useId, useMemo, useState } from 'react';

export type FandexLineChartPoint = {
  label: string;
  value: number;
};

export type FandexLineChartSeries = {
  id: string;
  label: string;
  points: FandexLineChartPoint[];
  color?: string;
};

type FandexLineChartProps = {
  title?: string;
  description?: string;
  ariaLabel: string;
  series: FandexLineChartSeries[];
  valueLocale?: string;
  maximumFractionDigits?: number;
  minimumFractionDigits?: number;
  changeFractionDigits?: number;
  period?: string;
  height?: number;
  minWidth?: number;
  showArea?: boolean;
};

type HoverState = {
  seriesIndex: number;
  pointIndex: number;
};

const defaultColors = [
  'var(--chart-accent)',
  'var(--chart-purple)',
  'var(--chart-green)',
  'var(--chart-red)',
];

function getChangeRate(points: FandexLineChartPoint[]) {
  const first = points[0];
  const latest = points[points.length - 1];

  if (!first || !latest || first.value === 0) {
    return 0;
  }

  return ((latest.value - first.value) / first.value) * 100;
}

export default function FandexLineChart({
  title,
  description,
  ariaLabel,
  series,
  valueLocale = 'ko-KR',
  maximumFractionDigits = 2,
  minimumFractionDigits = 0,
  changeFractionDigits = 2,
  period,
  height = 300,
  minWidth = 680,
  showArea = false,
}: FandexLineChartProps) {
  const [hover, setHover] = useState<HoverState | null>(null);
  const gradientId = useId().replace(/:/g, '');
  const chartWidth = 920;
  const chartHeight = height;
  const padding = 48;

  const allValues = series.flatMap((item) =>
    item.points.map((point) => point.value)
  );
  const firstSeries = series[0]?.points ?? [];
  const latestPoint = firstSeries[firstSeries.length - 1];
  const minValue = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1;
  const valueRange = maxValue - minValue || 1;
  const maxPointCount = Math.max(
    ...series.map((item) => item.points.length),
    1
  );
  const plotWidth = chartWidth - padding * 2;
  const plotHeight = chartHeight - padding * 2;
  const yGuideValues = [maxValue, minValue + valueRange * 0.5, minValue];
  const chartPeriod =
    period ??
    (firstSeries.length > 0
      ? `${firstSeries[0].label} - ${firstSeries[firstSeries.length - 1].label}`
      : '-');
  const latestAverage =
    series.length > 0
      ? series.reduce((total, item) => {
          const latest = item.points[item.points.length - 1];
          return total + (latest?.value ?? 0);
        }, 0) / series.length
      : 0;
  const currentValue = series.length > 1 ? latestAverage : latestPoint?.value ?? 0;
  const changeRate =
    series.length > 1
      ? series.reduce((total, item) => total + getChangeRate(item.points), 0) /
        series.length
      : getChangeRate(firstSeries);
  const valueFormatter = useMemo(
    () =>
      new Intl.NumberFormat(valueLocale, {
        maximumFractionDigits,
        minimumFractionDigits,
      }),
    [maximumFractionDigits, minimumFractionDigits, valueLocale]
  );

  function formatValue(value: number) {
    return valueFormatter.format(value);
  }

  function formatChange(value: number) {
    return `${value >= 0 ? '+' : ''}${value.toFixed(changeFractionDigits)}%`;
  }

  const chartSeries = useMemo(
    () =>
      series.map((item, seriesIndex) => {
        const color = item.color ?? defaultColors[seriesIndex % defaultColors.length];
        const points = item.points.map((point, pointIndex) => {
          const x =
            padding + (pointIndex / Math.max(maxPointCount - 1, 1)) * plotWidth;
          const y =
            padding + ((maxValue - point.value) / valueRange) * plotHeight;

          return { ...point, x, y };
        });

        return {
          ...item,
          color,
          points,
          linePoints: points.map((point) => `${point.x},${point.y}`).join(' '),
        };
      }),
    [maxPointCount, maxValue, plotHeight, plotWidth, series, valueRange]
  );

  const hoverPoint =
    hover && chartSeries[hover.seriesIndex]?.points[hover.pointIndex]
      ? {
          series: chartSeries[hover.seriesIndex],
          point: chartSeries[hover.seriesIndex].points[hover.pointIndex],
        }
      : null;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      {(title || description) && (
        <div className="mb-4">
          {title && <h3 className="text-lg font-black text-slate-950">{title}</h3>}
          {description && (
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile label="Current" value={formatValue(currentValue)} />
        <StatTile label="Change" value={formatChange(changeRate)} />
        <StatTile label="High" value={formatValue(maxValue)} />
        <StatTile label="Low" value={formatValue(minValue)} />
        <StatTile label="Period" value={chartPeriod} />
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        {chartSeries.map((item) => (
          <div key={item.id} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs font-bold text-slate-500">
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div
        className="relative overflow-x-auto rounded-xl border border-slate-100 bg-white"
        onPointerLeave={() => setHover(null)}
      >
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full"
          style={{ height: chartHeight, minWidth }}
          role="img"
          aria-label={ariaLabel}
        >
          <defs>
            <linearGradient id={`${gradientId}-area`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-accent)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--chart-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yGuideValues.map((value) => {
            const y = padding + ((maxValue - value) / valueRange) * plotHeight;

            return (
              <g key={value}>
                <line
                  x1={padding}
                  x2={chartWidth - padding}
                  y1={y}
                  y2={y}
                  stroke="var(--chart-grid)"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[11px]"
                >
                  {formatValue(value)}
                </text>
              </g>
            );
          })}

          {chartSeries.map((item, seriesIndex) => {
            const areaPoints =
              showArea && item.points.length > 0
                ? [
                    `${item.points[0].x},${chartHeight - padding}`,
                    item.linePoints,
                    `${item.points[item.points.length - 1].x},${
                      chartHeight - padding
                    }`,
                  ].join(' ')
                : null;

            return (
              <g key={item.id}>
                {areaPoints && (
                  <polygon points={areaPoints} fill={`url(#${gradientId}-area)`} />
                )}
                <polyline
                  points={item.linePoints}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {item.points.map((point, pointIndex) => (
                  <g key={`${item.id}-${point.label}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={hover?.seriesIndex === seriesIndex && hover.pointIndex === pointIndex ? 7 : 4}
                      fill="var(--chart-point-fill)"
                      stroke={item.color}
                      strokeWidth="3"
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="14"
                      fill="transparent"
                      className="cursor-pointer"
                      onPointerEnter={() =>
                        setHover({ seriesIndex, pointIndex })
                      }
                      onPointerMove={() => setHover({ seriesIndex, pointIndex })}
                    />
                    {seriesIndex === 0 && (
                      <text
                        x={point.x}
                        y={chartHeight - 12}
                        textAnchor="middle"
                        className="fill-slate-500 text-[11px]"
                      >
                        {point.label}
                      </text>
                    )}
                  </g>
                ))}
              </g>
            );
          })}
        </svg>

        {hoverPoint && (
          <div
            className="pointer-events-none absolute rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
            style={{
              left: `max(0.75rem, min(calc(100% - 11rem), ${
                (hoverPoint.point.x / chartWidth) * 100
              }%))`,
              top: `max(0.75rem, calc(${hoverPoint.point.y}px - 1.5rem))`,
            }}
          >
            <p className="font-black text-slate-950">{hoverPoint.series.label}</p>
            <p className="mt-1 font-bold text-slate-500">
              {hoverPoint.point.label}
            </p>
            <p className="mt-1 font-mono text-sm font-black text-cyan-600">
              {formatValue(hoverPoint.point.value)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-lg font-black text-slate-950">
        {value}
      </p>
      {detail && (
        <p className="mt-1 text-xs font-bold leading-5 text-slate-500">
          {detail}
        </p>
      )}
    </article>
  );
}
