'use client';

import { useId, useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { direction, formatAxis, formatDateTime, formatPrice } from '../../../lib/market/format';
import type { PeriodId, SeriesPoint } from '../../../lib/market/types';

type Props = {
  points: SeriesPoint[];
  period: PeriodId;
  height?: number;
  valueLabel?: string;
};

const COLOR = {
  up: 'var(--fx-up)',
  down: 'var(--fx-down)',
  flat: 'var(--fx-sub)',
} as const;

export default function PriceChart({ points, period, height = 320, valueLabel = '가격' }: Props) {
  const gradientId = useId().replace(/:/g, '');
  const first = points[0]?.value ?? 0;
  const last = points[points.length - 1]?.value ?? 0;
  const tone = direction(last - first);
  const color = COLOR[tone];

  const domain = useMemo(() => {
    const values = points.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = (max - min) * 0.12 || max * 0.01 || 1;
    return [min - pad, max + pad] as [number, number];
  }, [points]);

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--fx-grid)" />
          <XAxis
            dataKey="time"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(time: number) => formatAxis(time, period)}
            tick={{ fill: 'var(--fx-faint)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            minTickGap={48}
          />
          <YAxis
            orientation="right"
            domain={domain}
            tickFormatter={(value: number) => formatPrice(value)}
            tick={{ fill: 'var(--fx-faint)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={72}
          />
          <ReferenceLine y={first} stroke="var(--fx-faint)" strokeDasharray="3 4" strokeOpacity={0.6} />
          <Tooltip
            cursor={{ stroke: 'var(--fx-faint)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as SeriesPoint | undefined;
              if (!active || !point) return null;
              return (
                <div className="rounded-lg border border-fx-line bg-fx-surface px-3 py-2 text-xs shadow-lg">
                  <p className="text-fx-sub">{formatDateTime(point.time)}</p>
                  <p className="fx-num mt-0.5 text-sm font-bold text-fx-ink">
                    {valueLabel} {formatPrice(point.value)}
                  </p>
                </div>
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
