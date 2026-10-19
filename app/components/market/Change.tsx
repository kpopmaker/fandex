import { direction, formatSignedNumber, formatSignedPercent } from '../../../lib/market/format';

const TONE = {
  up: 'text-fx-up',
  down: 'text-fx-down',
  flat: 'text-fx-sub',
} as const;

export function toneClass(value: number) {
  return TONE[direction(value)];
}

export function ChangeRate({ rate, className = '' }: { rate: number; className?: string }) {
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

export function PointDelta({ delta, className = '' }: { delta: number; className?: string }) {
  return (
    <span className={`fx-num ${toneClass(delta)} ${className}`}>
      {formatSignedNumber(delta, 1)}
    </span>
  );
}
