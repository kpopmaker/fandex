import { direction, formatSignedNumber, formatSignedPercent } from '../../../lib/market/format';

const TONE = {
  up: 'text-fx-up',
  down: 'text-fx-down',
  flat: 'text-fx-sub',
} as const;

export function toneClass(value: number) {
  return TONE[direction(value)];
}

/** 비교할 과거 기록이 없으면 '—' */
export function ChangeRate({ rate, className = '' }: { rate: number | null; className?: string }) {
  if (rate === null) {
    return (
      <span className={`fx-num text-fx-faint ${className}`} title="비교할 기록이 아직 없어요">
        —
      </span>
    );
  }
  return <span className={`fx-num ${toneClass(rate)} ${className}`}>{formatSignedPercent(rate)}</span>;
}

export function ChangeAmount({
  amount,
  rate,
  className = '',
}: {
  amount: number;
  rate: number;
  className?: string;
}) {
  const dir = direction(rate);
  const arrow = dir === 'up' ? '▲' : dir === 'down' ? '▼' : '';
  return (
    <span className={`fx-num ${TONE[dir]} ${className}`}>
      {arrow && <span aria-hidden="true">{arrow} </span>}
      {formatSignedNumber(Math.abs(amount)).replace(/^[+−]/, '')} ({formatSignedPercent(rate)})
    </span>
  );
}

export function PointDelta({ delta, className = '' }: { delta: number | null; className?: string }) {
  if (delta === null) return <span className={`fx-num text-fx-faint ${className}`}>—</span>;
  return (
    <span className={`fx-num ${toneClass(delta)} ${className}`}>
      {formatSignedNumber(delta, 1)}
    </span>
  );
}
