export type ProductObservationInstant = Readonly<{
  kind: 'instant';
  observedAt: string;
}>;

export type ProductObservationPeriod = Readonly<{
  kind: 'period';
  start: string;
  end: string;
}>;

export type ProductUnknownObservation = Readonly<{
  kind: 'unknown';
}>;

export type ProductObservationTime =
  | ProductObservationInstant
  | ProductObservationPeriod
  | ProductUnknownObservation;

export type ProductRawProviderPeriod = Readonly<{
  kind: 'raw';
  rawLabel: string;
  start: null;
  end: null;
}>;

export type ProductParsedProviderPeriod = Readonly<{
  kind: 'parsed';
  rawLabel: string;
  start: string;
  end: string;
}>;

export type ProductProviderPeriod =
  | ProductRawProviderPeriod
  | ProductParsedProviderPeriod;

export type ProductCollectionTime = Readonly<{
  collectedAt: string;
}>;

export type ProductGeneratedTime = Readonly<{
  generatedAt: string;
}>;

export type ProductRevisionTime = Readonly<{
  revisionObservedAt: string;
}>;

export type ProductDataTime = Readonly<{
  dataAsOf: ProductObservationTime;
  updatedAt: string | null;
}>;

export type ProductTimeContext = Readonly<{
  observationTime: ProductObservationTime;
  providerPeriod: ProductProviderPeriod | null;
  collectionTime: ProductCollectionTime | null;
  revisionTime: ProductRevisionTime | null;
  generatedTime: ProductGeneratedTime | null;
}>;
