export type ProductAvailableNumericFact = Readonly<{
  availability: 'available';
  value: number;
}>;

export type ProductMissingNumericFact = Readonly<{
  availability: 'missing';
  value: null;
}>;

export type ProductNotRankedNumericFact = Readonly<{
  availability: 'not-ranked';
  value: null;
}>;

export type ProductNotTrackedNumericFact = Readonly<{
  availability: 'not-tracked';
  value: null;
}>;

export type ProductUnavailableNumericFact = Readonly<{
  availability: 'unavailable';
  value: null;
}>;

export type ProductNumericFact =
  | ProductAvailableNumericFact
  | ProductNotRankedNumericFact
  | ProductMissingNumericFact
  | ProductNotTrackedNumericFact
  | ProductUnavailableNumericFact;

export function makeAvailableProductNumericFact(
  value: number,
): ProductAvailableNumericFact {
  if (!Number.isFinite(value)) {
    throw new TypeError('An available Product numeric fact requires a finite value.');
  }

  return Object.freeze({ availability: 'available', value });
}

export function makeMissingProductNumericFact(): ProductMissingNumericFact {
  return Object.freeze({ availability: 'missing', value: null });
}

export function makeNotRankedProductNumericFact(): ProductNotRankedNumericFact {
  return Object.freeze({ availability: 'not-ranked', value: null });
}

export function makeNotTrackedProductNumericFact(): ProductNotTrackedNumericFact {
  return Object.freeze({ availability: 'not-tracked', value: null });
}

export function makeUnavailableProductNumericFact(): ProductUnavailableNumericFact {
  return Object.freeze({ availability: 'unavailable', value: null });
}
