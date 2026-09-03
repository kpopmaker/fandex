import { FANDEX_METRIC_DEFINITIONS } from '../../../app/data/v4/metrics/fandexMetricDefinitions';
import {
  getV4ProductMetricReadModel,
  type V4ProductMetricReadModelInput,
} from '../adapters/v4ProductMetricReadModel';
import type {
  ProductArtistMetricCollection,
  ProductMetricCollectionEntry,
} from '../contracts/productMetricCollection';
import type { ProductMetricReadModelResult } from '../contracts/productMetricReadModel';

export type ArtistProductMetricCollectionInput = Readonly<{
  artistId: string;
  month: string;
}>;

export type ProductMetricReadModelQuery = (
  input: V4ProductMetricReadModelInput,
) => ProductMetricReadModelResult;

export function getArtistProductMetricCollection(
  input: ArtistProductMetricCollectionInput,
  readMetric: ProductMetricReadModelQuery = getV4ProductMetricReadModel,
): ProductArtistMetricCollection {
  const artistId = input.artistId.trim();
  const sourceMonth = input.month.trim();
  const entries = FANDEX_METRIC_DEFINITIONS.map((definition) => {
    const result = readMetric({
      artistId,
      metricKey: definition.key,
      month: sourceMonth,
    });

    return Object.freeze({
      sourceMetricKey: definition.key,
      ...result,
    }) satisfies ProductMetricCollectionEntry;
  });

  return Object.freeze({
    artistId,
    sourceMonth,
    entries: Object.freeze(entries),
  });
}
