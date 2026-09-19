import {
  getArtistIndexChartProfile,
  type ArtistIndexChartProfile,
  type ArtistIndexHistoryPoint,
} from '../../../app/data/v4/charts/artistIndexChartData';
import {
  makeAvailableProductNumericFact,
  makeMissingProductNumericFact,
  makeNotTrackedProductNumericFact,
} from '../contracts/productNumericFact';
import type {
  ProductVariableDefinition,
  ProductVariableReadModel,
  ProductVariableReadModelResult,
  ProductVariableSeriesPoint,
  ProductVariableSourceMetadata,
} from '../contracts/productVariable';
import {
  PRODUCT_VARIABLE_DEFINITION_BY_ID,
  validateProductVariableId,
} from '../variables/productVariableDefinitions';

export type ArtistProductVariableInput = Readonly<{
  artistId: string;
  variableId: string;
}>;

export type ProductVariableRuntime = Readonly<{
  getArtistProfile: (artistId: string) => ArtistIndexChartProfile | undefined;
}>;

const defaultRuntime: ProductVariableRuntime = Object.freeze({
  getArtistProfile: getArtistIndexChartProfile,
});

function readPointValue(
  point: ArtistIndexHistoryPoint,
  definition: ProductVariableDefinition,
) {
  return (point as unknown as Record<string, unknown>)[definition.sourceKey];
}

function makeSourceMetadata(
  artistId: string,
  definition: ProductVariableDefinition,
  profile: ArtistIndexChartProfile | undefined,
  latestPoint: ArtistIndexHistoryPoint | undefined,
): ProductVariableSourceMetadata {
  return Object.freeze({
    sourceKind: 'legacy-derived-index-point',
    sourceArtistId: artistId,
    sourceVariableKey: definition.sourceKey,
    sourceTimeLabel: latestPoint?.date ?? null,
    dataStatus: latestPoint?.dataStatus ?? null,
    confidenceLevel: latestPoint?.confidenceLevel ?? null,
    coverageStatus: profile?.coverageStatus ?? null,
  });
}

function makeOkResult(
  model: ProductVariableReadModel,
): ProductVariableReadModelResult {
  return Object.freeze({ status: 'ok', model: Object.freeze(model) });
}

export function getArtistProductVariable(
  input: ArtistProductVariableInput,
  runtime: ProductVariableRuntime = defaultRuntime,
): ProductVariableReadModelResult {
  const artistId = input.artistId.trim();
  const identity = validateProductVariableId(input.variableId);

  if (identity.status === 'invalid') {
    return Object.freeze({
      status: 'data-issue',
      issues: Object.freeze([
        Object.freeze({
          code: 'invalid-variable-identity' as const,
          rawVariableId: identity.rawVariableId,
        }),
      ]),
      sourceMetadata: Object.freeze({
        sourceArtistId: artistId,
        rawVariableId: identity.rawVariableId,
        sourceTimeLabel: null,
      }),
    });
  }

  const definition = PRODUCT_VARIABLE_DEFINITION_BY_ID.get(identity.variableId);

  if (!definition) {
    throw new Error(`Validated Product variable ${identity.variableId} is missing.`);
  }

  const profile = runtime.getArtistProfile(artistId);

  if (!profile) {
    return makeOkResult({
      identity: Object.freeze({
        sourceArtistId: artistId,
        variableId: definition.variableId,
        sourceVariableKey: definition.sourceKey,
      }),
      definition,
      fact: makeNotTrackedProductNumericFact(),
      series: Object.freeze([]),
      observationTime: Object.freeze({ kind: 'unknown' }),
      presentation: 'preview',
      dataOrigin: 'synthetic',
      sourceMetadata: makeSourceMetadata(
        artistId,
        definition,
        undefined,
        undefined,
      ),
    });
  }

  if (profile.artistId !== artistId) {
    return Object.freeze({
      status: 'data-issue',
      issues: Object.freeze([
        Object.freeze({
          code: 'source-state-conflict' as const,
          reason: 'artist-identity-mismatch' as const,
        }),
      ]),
      sourceMetadata: Object.freeze({
        sourceArtistId: artistId,
        rawVariableId: input.variableId,
        sourceTimeLabel: profile.history.at(-1)?.date ?? null,
      }),
    });
  }

  const series: ProductVariableSeriesPoint[] = [];

  for (const point of profile.history) {
    const sourceValue = readPointValue(point, definition);

    if (
      sourceValue !== null &&
      sourceValue !== undefined &&
      (typeof sourceValue !== 'number' || !Number.isFinite(sourceValue))
    ) {
      return Object.freeze({
        status: 'data-issue',
        issues: Object.freeze([
          Object.freeze({
            code: 'invalid-source-value' as const,
            sourceTimeLabel: point.date,
          }),
        ]),
        sourceMetadata: Object.freeze({
          sourceArtistId: artistId,
          rawVariableId: input.variableId,
          sourceTimeLabel: point.date,
        }),
      });
    }

    series.push(
      Object.freeze({
        sourceTimeLabel: point.date,
        fact:
          sourceValue === null || sourceValue === undefined
            ? makeMissingProductNumericFact()
            : makeAvailableProductNumericFact(sourceValue),
      }),
    );
  }

  const latestPoint = profile.history.at(-1);
  const latestFact = series.at(-1)?.fact ?? makeMissingProductNumericFact();

  return makeOkResult({
    identity: Object.freeze({
      sourceArtistId: artistId,
      variableId: definition.variableId,
      sourceVariableKey: definition.sourceKey,
    }),
    definition,
    fact: latestFact,
    series: Object.freeze(series),
    observationTime: Object.freeze({ kind: 'unknown' }),
    presentation: 'preview',
    dataOrigin: 'synthetic',
    sourceMetadata: makeSourceMetadata(
      artistId,
      definition,
      profile,
      latestPoint,
    ),
  });
}
