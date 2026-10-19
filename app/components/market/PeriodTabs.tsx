'use client';

import { PERIODS } from '../../../lib/market/time';
import type { PeriodId } from '../../../lib/market/types';

export default function PeriodTabs({
  value,
  onChange,
  label = '차트 기간',
}: {
  value: PeriodId;
  onChange: (period: PeriodId) => void;
  label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl bg-fx-raised p-1">
      {PERIODS.map((period) => {
        const selected = period.id === value;
        return (
          <button
            key={period.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(period.id)}
            className={`min-w-11 rounded-lg px-3 py-1.5 text-[13px] transition-colors ${
              selected
                ? 'bg-fx-surface font-bold text-fx-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]'
                : 'font-medium text-fx-sub hover:text-fx-ink'
            }`}
          >
            {period.label}
          </button>
        );
      })}
    </div>
  );
}
