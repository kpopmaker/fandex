import type { FandexVariableKey } from '../../../app/data/v4/metrics/fandexMetricTypes';
import type { ProductMetricReadModelResult } from './productMetricReadModel';

export type ProductMetricCollectionEntry = Readonly<{
  sourceMetricKey: FandexVariableKey;
}> & ProductMetricReadModelResult;

export type ProductArtistMetricCollection = Readonly<{
  artistId: string;
  sourceMonth: string;
  entries: readonly ProductMetricCollectionEntry[];
}>;
