type ComparePriceChartRow = {
  artist: {
    id: string;
    nameKo: string;
    nameEn: string;
    ticker: string;
  };
  history: Array<{
    time: string;
    price: number;
  }>;
};

type ComparePriceChartProps = {
  rows: ComparePriceChartRow[];
};

const chartColors = ['#22d3ee', '#a78bfa', '#34d399', '#fb7185'];

export default function ComparePriceChart({ rows }: ComparePriceChartProps) {
  const chartWidth = 920;
  const chartHeight = 340;
  const padding = 48;

  const allPrices = rows.flatMap((row) =>
    row.history.map((point) => point.price)
  );

  const minValue = allPrices.length > 0 ? Math.min(...allPrices) : 0;
  const maxValue = allPrices.length > 0 ? Math.max(...allPrices) : 1;
  const valueRange = maxValue - minValue || 1;

  const maxPointCount = Math.max(...rows.map((row) => row.history.length), 1);

  const plotWidth = chartWidth - padding * 2;
  const plotHeight = chartHeight - padding * 2;

  const yGuideValues = [maxValue, minValue + valueRange * 0.5, minValue];

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-white">
            FANDEX price trend
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Compare selected artists over time using the internal FANDEX price
            index.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {rows.map((row, index) => (
            <div key={row.artist.id} className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: chartColors[index % chartColors.length],
                }}
              />
              <span className="text-xs font-bold text-slate-400">
                {row.artist.nameEn}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 p-4">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-[340px] min-w-[760px] w-full"
          role="img"
          aria-label="Artist FANDEX price comparison chart"
        >
          {yGuideValues.map((value) => {
            const y =
              padding + ((maxValue - value) / valueRange) * plotHeight;

            return (
              <g key={value}>
                <line
                  x1={padding}
                  x2={chartWidth - padding}
                  y1={y}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="4 4"
                />

                <text
                  x={padding - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-500 text-[11px]"
                >
                  {value.toFixed(1)}
                </text>
              </g>
            );
          })}

          {rows.map((row, rowIndex) => {
            const color = chartColors[rowIndex % chartColors.length];

            const chartPoints = row.history.map((point, index) => {
              const x =
                padding +
                (index / Math.max(maxPointCount - 1, 1)) * plotWidth;

              const y =
                padding +
                ((maxValue - point.price) / valueRange) * plotHeight;

              return {
                ...point,
                x,
                y,
              };
            });

            const linePoints = chartPoints
              .map((point) => `${point.x},${point.y}`)
              .join(' ');

            return (
              <g key={row.artist.id}>
                <polyline
                  points={linePoints}
                  fill="none"
                  stroke={color}
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {chartPoints.map((point) => (
                  <g key={`${row.artist.id}-${point.time}`}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill="#020617"
                      stroke={color}
                      strokeWidth="3"
                    />

                    {rowIndex === 0 && (
                      <text
                        x={point.x}
                        y={chartHeight - 12}
                        textAnchor="middle"
                        className="fill-slate-500 text-[11px]"
                      >
                        {point.time}
                      </text>
                    )}
                  </g>
                ))}

                {chartPoints.length > 0 && (
                  <text
                    x={chartPoints[chartPoints.length - 1].x + 10}
                    y={chartPoints[chartPoints.length - 1].y + 4}
                    className="fill-slate-300 text-[11px] font-bold"
                  >
                    {row.artist.ticker}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
