import type { ProductMetricReadModel } from '../contracts/productMetricReadModel';

export type ArtistMetricPresentationSource =
  | Readonly<{
      status: 'ok';
      model: Pick<ProductMetricReadModel, 'fact' | 'presentation'>;
    }>
  | Readonly<{
      status: 'data-issue';
    }>;

export type ArtistMetricCardPresentation = Readonly<{
  state: 'available' | 'not-ranked' | 'missing' | 'not-tracked' | 'unavailable' | 'data-issue';
  valueText: string;
  showPreviewBadge: boolean;
}>;

const metricValueFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 20,
});

export function getArtistMetricCardPresentation(
  source: ArtistMetricPresentationSource,
): ArtistMetricCardPresentation {
  if (source.status === 'data-issue') {
    return Object.freeze({
      state: 'data-issue',
      valueText: '데이터 확인 필요',
      showPreviewBadge: false,
    });
  }

  const showPreviewBadge = source.model.presentation === 'preview';
  const fact = source.model.fact;

  if (fact.availability === 'missing') {
    return Object.freeze({
      state: 'missing',
      valueText: '관측 없음',
      showPreviewBadge,
    });
  }

  if (fact.availability === 'not-tracked') {
    return Object.freeze({
      state: 'not-tracked',
      valueText: '미추적',
      showPreviewBadge,
    });
  }

  if (fact.availability === 'not-ranked') {
    return Object.freeze({
      state: 'not-ranked',
      valueText: '\uC21C\uC704 \uC5C6\uC74C',
      showPreviewBadge,
    });
  }

  if (fact.availability === 'unavailable') {
    return Object.freeze({
      state: 'unavailable',
      valueText: '\uC0AC\uC6A9 \uBD88\uAC00',
      showPreviewBadge,
    });
  }

  if (fact.availability !== 'available' || typeof fact.value !== 'number') {
    return Object.freeze({
      state: 'data-issue',
      valueText: '\uB370\uC774\uD130 \uD655\uC778 \uD544\uC694',
      showPreviewBadge,
    });
  }

  return Object.freeze({
    state: 'available',
    valueText: metricValueFormatter.format(fact.value),
    showPreviewBadge,
  });
}
