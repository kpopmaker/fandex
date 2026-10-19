'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatAxis, formatDateTime } from '../../../lib/market/format';
import type { PeriodId } from '../../../lib/market/types';

export type LineDefinition = {
  key: string;
  label: string;
  color: string;
};

type Props = {
  data: Array<{ time: number } & Record<string, number>>;
  lines: LineDefinition[];
  period: PeriodId;
  height?: number;
  formatValue: (value: number) => string;
  referenceY?: number;
  domain?: [number | 'auto', number | 'auto'];
};

export default function MultiLineChart({
  data,
  lines,
  period,
  height = 300,
  formatValue,
  referenceY,
  domain = ['auto', 'auto'],
}: Props) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
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
            tickFormatter={(value: number) => formatValue(value)}
            tick={{ fill: 'var(--fx-faint)', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          {referenceY !== undefined && (
            <ReferenceLine y={referenceY} stroke="var(--fx-faint)" strokeDasharray="3 4" />
          )}
          <Tooltip
            cursor={{ stroke: 'var(--fx-faint)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as ({ time: number } & Record<string, number>) | undefined;
              if (!active || !row) return null;
              return (
                <div className="min-w-40 rounded-lg border border-fx-line bg-fx-surface px-3 py-2 text-xs shadow-lg">
                  <p className="mb-1 text-fx-sub">{formatDateTime(row.time)}</p>
                  {lines.map((line) => (
                    <p key={line.key} className="flex items-center justify-between gap-4 py-0.5">
                      <span className="flex items-center gap-1.5 text-fx-sub">
                        <span className="h-2 w-2 rounded-full" style={{ background: line.color }} />
                        {line.label}
                      </span>
                      <span className="fx-num font-bold text-fx-ink">{formatValue(row[line.key])}</span>
                    </p>
                  ))}
                </div>
              );
            }}
          />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              activeDot={{ r: 3.5, strokeWidth: 0, fill: line.color }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
