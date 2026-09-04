import {
  getMethodologyVariableDefinitions,
  type ArtistStockVariableKey,
} from '../../../app/data/v4/charts/artistIndexChartData';
import { FANDEX_METRIC_DEFINITIONS } from '../../../app/data/v4/metrics/fandexMetricDefinitions';
import type {
  ProductVariableDefinition,
  ProductVariableId,
} from '../contracts/productVariable';

export const PRODUCT_SAFE_VARIABLE_IDS = Object.freeze([
  'musicAlbumPoint',
  'newsIssuePoint',
  'snsFandomPoint',
  'brandFitPoint',
  'comebackActivityPoint',
  'growthMomentumPoint',
  'riskAdjustmentPoint',
] as const satisfies readonly ArtistStockVariableKey[]);

const methodologyDefinitionsByKey = new Map(
  getMethodologyVariableDefinitions().map((definition) => [
    definition.variableKey,
    definition,
  ]),
);

export const PRODUCT_VARIABLE_DEFINITIONS = Object.freeze(
  PRODUCT_SAFE_VARIABLE_IDS.map((variableId) => {
    const methodologyDefinition = methodologyDefinitionsByKey.get(variableId);

    if (!methodologyDefinition) {
      throw new Error(
        `Product-safe variable ${variableId} has no methodology definition.`,
      );
    }

    const relatedSourceMetricKeys = Object.freeze(
      FANDEX_METRIC_DEFINITIONS.filter(
        (definition) => definition.legacyChartKey === variableId,
      ).map((definition) => definition.key),
    );

    return Object.freeze({
      variableId,
      sourceKey: variableId,
      displayName: methodologyDefinition.displayName,
      description: methodologyDefinition.description,
      relatedSourceMetricKeys,
      evidenceRelation: Object.freeze({
        kind: 'legacy-issue-signal-key' as const,
        sourceKey: variableId,
      }),
    }) satisfies ProductVariableDefinition;
  }),
);

export const PRODUCT_VARIABLE_DEFINITION_BY_ID = new Map(
  PRODUCT_VARIABLE_DEFINITIONS.map((definition) => [
    definition.variableId,
    definition,
  ]),
);

export type ProductVariableIdentityValidation =
  | Readonly<{
      status: 'valid';
      variableId: ProductVariableId;
    }>
  | Readonly<{
      status: 'invalid';
      rawVariableId: string;
    }>;

export function validateProductVariableId(
  rawVariableId: string,
): ProductVariableIdentityValidation {
  const normalizedVariableId = rawVariableId.trim();
  const definition = PRODUCT_VARIABLE_DEFINITION_BY_ID.get(
    normalizedVariableId as ProductVariableId,
  );

  return definition
    ? Object.freeze({
        status: 'valid',
        variableId: definition.variableId,
      })
    : Object.freeze({
        status: 'invalid',
        rawVariableId,
      });
}
