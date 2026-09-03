export type ProductDirection = 'up' | 'down' | 'stable' | 'unknown';

export type ProductAvailability =
  | 'available'
  | 'not-ranked'
  | 'missing'
  | 'not-tracked'
  | 'unavailable';

export type ProductFreshness = 'current' | 'frozen' | 'unknown';

export type ProductConflictState = 'none' | 'detected';

export type ProductRevisionState = 'none' | 'revised';

export type ProductDataOrigin = 'observed' | 'synthetic';

export type ProductPublication = 'production' | 'shadow';

export type ProductPresentation = 'standard' | 'preview';

export type ProductState = Readonly<{
  availability: ProductAvailability;
  freshness: ProductFreshness;
  direction: ProductDirection;
  conflict: ProductConflictState;
  revision: ProductRevisionState;
  dataOrigin: ProductDataOrigin;
  publication: ProductPublication;
  presentation: ProductPresentation;
}>;
