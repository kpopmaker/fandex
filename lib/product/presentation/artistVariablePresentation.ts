import type { ProductNumericFact } from '../contracts/productNumericFact';
import type { ProductVariableReadModelResult } from '../contracts/productVariable';

export type ArtistVariablePresentation = Readonly<{
  state: 'available' | 'missing' | 'not-tracked' | 'data-issue';
  valueText: string;
  showPreviewBadge: boolean;
}>;

const variableValueFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 20,
});

export function formatProductVariableFact(fact: ProductNumericFact) {
  if (fact.availability === 'missing') {
    return '관측 없음';
  }

  if (fact.availability === 'not-tracked') {
    return '미추적';
  }

  if (fact.availability !== 'available' || typeof fact.value !== 'number') {
    return '\uB370\uC774\uD130 \uD655\uC778 \uD544\uC694';
  }

  return variableValueFormatter.format(fact.value);
}

export function getArtistVariablePresentation(
  result: ProductVariableReadModelResult,
): ArtistVariablePresentation {
  if (result.status === 'data-issue') {
    const invalidIdentity = result.issues.some(
      (issue) => issue.code === 'invalid-variable-identity',
    );

    return Object.freeze({
      state: 'data-issue',
      valueText: invalidIdentity ? '지원되지 않는 변수' : '데이터 확인 필요',
      showPreviewBadge: false,
    });
  }

  const fact = result.model.fact;
  const showPreviewBadge = result.model.presentation === 'preview';

  if (
    fact.availability === 'not-ranked' ||
    fact.availability === 'unavailable'
  ) {
    return Object.freeze({
      state: 'data-issue',
      valueText: '\uB370\uC774\uD130 \uD655\uC778 \uD544\uC694',
      showPreviewBadge,
    });
  }

  if (fact.availability === 'available') {
    return Object.freeze({
      state: 'available',
      valueText: formatProductVariableFact(fact),
      showPreviewBadge,
    });
  }

  if (fact.availability === 'missing') {
    return Object.freeze({
      state: 'missing',
      valueText: formatProductVariableFact(fact),
      showPreviewBadge,
    });
  }

  if (fact.availability === 'not-tracked') {
    return Object.freeze({
      state: 'not-tracked',
      valueText: formatProductVariableFact(fact),
      showPreviewBadge,
    });
  }

  return Object.freeze({
    state: 'data-issue',
    valueText: formatProductVariableFact(fact),
    showPreviewBadge,
  });
}
