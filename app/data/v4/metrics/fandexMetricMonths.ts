import type { FandexMetricMonth } from './fandexMetricTypes';

export const FANDEX_METRIC_START_MONTH = '2025-07';
export const FANDEX_METRIC_END_MONTH = '2026-07';

export const FANDEX_METRIC_MONTHS: FandexMetricMonth[] = [
  { month: '2025-07', label: '25.07', displayLabel: '2025년 7월' },
  { month: '2025-08', label: '25.08', displayLabel: '2025년 8월' },
  { month: '2025-09', label: '25.09', displayLabel: '2025년 9월' },
  { month: '2025-10', label: '25.10', displayLabel: '2025년 10월' },
  { month: '2025-11', label: '25.11', displayLabel: '2025년 11월' },
  { month: '2025-12', label: '25.12', displayLabel: '2025년 12월' },
  { month: '2026-01', label: '26.01', displayLabel: '2026년 1월' },
  { month: '2026-02', label: '26.02', displayLabel: '2026년 2월' },
  { month: '2026-03', label: '26.03', displayLabel: '2026년 3월' },
  { month: '2026-04', label: '26.04', displayLabel: '2026년 4월' },
  { month: '2026-05', label: '26.05', displayLabel: '2026년 5월' },
  { month: '2026-06', label: '26.06', displayLabel: '2026년 6월' },
  { month: '2026-07', label: '26.07', displayLabel: '2026년 7월' },
];

export const FANDEX_METRIC_MONTH_LABELS = FANDEX_METRIC_MONTHS.map(
  (month) => month.label,
);

export function getFandexMetricMonthByLabel(label: string) {
  return FANDEX_METRIC_MONTHS.find((month) => month.label === label);
}

export function getFandexMetricMonth(month: string) {
  return FANDEX_METRIC_MONTHS.find((item) => item.month === month);
}
