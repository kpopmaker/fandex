import type { ProductDashboardArtistEntry } from '../contracts/productDashboard';

export type ProductDashboardArtistPresentation = Readonly<{
  state: 'available' | 'missing' | 'not-tracked' | 'data-issue';
  valueText: string;
}>;

export function getProductDashboardArtistPresentation(
  entry: ProductDashboardArtistEntry,
): ProductDashboardArtistPresentation {
  if (entry.status === 'data-issue') {
    return Object.freeze({
      state: 'data-issue',
      valueText: '데이터 확인 필요',
    });
  }

  const fact = entry.currentFandex;

  if (fact.availability === 'missing') {
    return Object.freeze({ state: 'missing', valueText: '관측 없음' });
  }

  if (fact.availability === 'not-tracked') {
    return Object.freeze({ state: 'not-tracked', valueText: '미추적' });
  }

  if (fact.availability !== 'available' || typeof fact.value !== 'number') {
    return Object.freeze({
      state: 'data-issue',
      valueText: '\uB370\uC774\uD130 \uD655\uC778 \uD544\uC694',
    });
  }

  return Object.freeze({
    state: 'available',
    valueText: `${new Intl.NumberFormat('ko-KR', {
      maximumFractionDigits: 2,
    }).format(fact.value)}pt`,
  });
}
