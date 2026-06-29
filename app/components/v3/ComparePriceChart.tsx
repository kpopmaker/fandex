import FandexLineChart from '../FandexLineChart';

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

const chartColors = [
  'var(--chart-accent)',
  'var(--chart-purple)',
  'var(--chart-green)',
  'var(--chart-red)',
];

export default function ComparePriceChart({ rows }: ComparePriceChartProps) {
  const firstHistory = rows[0]?.history ?? [];
  const period =
    firstHistory.length > 0
      ? `${firstHistory[0].time} - ${firstHistory[firstHistory.length - 1].time}`
      : '-';

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950">
            FANDEX price trend
          </h2>
          <p className="mt-1 text-sm text-slate-500">
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
              <span className="text-xs font-bold text-slate-500">
                {row.artist.nameEn}
              </span>
            </div>
          ))}
        </div>
      </div>

      <FandexLineChart
        ariaLabel="Artist FANDEX price comparison chart"
        period={period}
        height={340}
        minWidth={760}
        valueLocale="en-US"
        minimumFractionDigits={2}
        maximumFractionDigits={2}
        changeFractionDigits={2}
        series={rows.map((row, index) => ({
          id: row.artist.id,
          label: row.artist.nameEn,
          color: chartColors[index % chartColors.length],
          points: row.history.map((point) => ({
            label: point.time,
            value: point.price,
          })),
        }))}
      />
    </section>
  );
}
