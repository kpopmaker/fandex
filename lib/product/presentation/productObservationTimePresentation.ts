import type { ProductObservationTime } from '../contracts/productTime';

export type ProductObservationTimePresentation = Readonly<{
  label: '관측 기간' | '관측 시점' | '관측 정보';
  value: string;
}>;

export function getProductObservationTimePresentation(
  observationTime: ProductObservationTime,
): ProductObservationTimePresentation {
  if (observationTime.kind === 'period') {
    return Object.freeze({
      label: '관측 기간' as const,
      value: `${observationTime.start} → ${observationTime.end}`,
    });
  }

  if (observationTime.kind === 'instant') {
    return Object.freeze({
      label: '관측 시점' as const,
      value: observationTime.observedAt,
    });
  }

  return Object.freeze({
    label: '관측 정보' as const,
    value: '확인 불가',
  });
}
