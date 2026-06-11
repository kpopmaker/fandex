import type { ChartPoint } from '../../data/v3/types';

type LineChartCardProps = {
  title: string;
  subtitle?: string;
  points: ChartPoint[];
  valueSuffix?: string;
  height?: number;
};

function formatValue(value: number, suffix = '') {
  return `${new Intl.NumberFormat('ko-KR', {
    maximumFractionDigits: 2,
  }).format(value)}${suffix}`;
}

function createPolylinePoints(points: ChartPoint[], width: number, height: number) {
  if (points.length === 0) {
    return '';
  }

  if (points.length === 1) {
    return `${width / 2},${height / 2}`;
  }

  const values = points.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  return points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * width;
      const y = height - ((point.value - minValue) / range) * height;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export default function LineChartCard({
  title,
  subtitle,
  points,
  valueSuffix = '',
  height = 260,
}: LineChartCardProps) {
  const chartWidth = 800;
  const chartHeight = 240;
  const polylinePoints = createPolylinePoints(points, chartWidth, chartHeight);

  const latestPoint = points[points.length - 1];
  const firstPoint = points[0];

  const changeValue =
    latestPoint && firstPoint
      ? latestPoint.value - firstPoint.value
      : 0;

  const changeRate =
    latestPoint && firstPoint && firstPoint.value !== 0
      ? (changeValue / firstPoint.value) * 100
      : 0;

  const isUp = changeValue >= 0;

  const maxValue = points.length > 0 ? Math.max(...points.map((point) => point.value)) : 0;
  const minValue = points.length > 0 ? Math.min(...points.map((point) => point.value)) : 0;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold text-cyan-600 dark:text-cyan-300">
            {title}
          </p>

          {subtitle && (
            <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {subtitle}
            </h2>
          )}
        </div>

        {latestPoint && (
          <div className="text-left md:text-right">
            <p className="text-sm text-slate-500">현재값</p>
            <p className="mt-1 font-mono text-3xl font-black text-slate-950 dark:text-white">
              {formatValue(latestPoint.value, valueSuffix)}
            </p>
            <p
              className={`mt-1 font-mono text-sm font-black ${
                isUp ? 'text-red-500' : 'text-blue-500'
              }`}
            >
              {isUp ? '+' : ''}
              {changeRate.toFixed(2)}%
            </p>
          </div>
        )}
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60"
        style={{ height }}
      >
        <div className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-500 shadow-sm dark:bg-slate-950/80 dark:text-slate-400">
          최고 {formatValue(maxValue, valueSuffix)}
        </div>

        <div className="absolute bottom-4 left-4 z-10 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-500 shadow-sm dark:bg-slate-950/80 dark:text-slate-400">
          최저 {formatValue(minValue, valueSuffix)}
        </div>

        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-full w-full"
          preserveAspectRatio="none"
          role="img"
          aria-label={`${title} 꺾은선 그래프`}
        >
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>

          <line
            x1="0"
            y1="60"
            x2={chartWidth}
            y2="60"
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="120"
            x2={chartWidth}
            y2="120"
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="1"
          />
          <line
            x1="0"
            y1="180"
            x2={chartWidth}
            y2="180"
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="1"
          />

          {polylinePoints && (
            <polyline
              points={polylinePoints}
              fill="none"
              className={isUp ? 'stroke-red-500' : 'stroke-blue-500'}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {points.map((point, index) => {
            if (points.length <= 1) {
              return null;
            }

            const values = points.map((item) => item.value);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const range = max - min || 1;

            const x = (index / (points.length - 1)) * chartWidth;
            const y = chartHeight - ((point.value - min) / range) * chartHeight;

            return (
              <circle
                key={`${point.time}-${point.value}`}
                cx={x}
                cy={y}
                r="5"
                className={isUp ? 'fill-red-500' : 'fill-blue-500'}
              />
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-400">
        <span>{points[0]?.time ?? '-'}</span>
        <span>{points[points.length - 1]?.time ?? '-'}</span>
      </div>
    </div>
  );
}