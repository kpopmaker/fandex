import {
  buildActivityExposureRiskQualityMetadata,
  type ActivityExposureRiskQualityMetadataResult,
} from './activityExposureRiskQualityMetadata';
import {
  createFandexVariableProductRecord,
  type FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../contracts/productActivityExposurePublicRoute';

export const ACTIVITY_EXPOSURE_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION =
  'activity-exposure-fandex-variable-product-adapter-v1' as const;

export type ActivityExposureFandexVariableProductAdapterResult =
  | Readonly<{
      status: 'ok';
      record: FandexVariableProductRecord;
    }>
  | Readonly<{
      status: 'blocked';
      reason:
        | Extract<
            ActivityExposureRiskQualityMetadataResult,
            { status: 'blocked' }
          >['reason']
        | 'upstream-identity-unresolved';
    }>;

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

export function adaptActivityExposureToFandexVariableProduct(
  result: ProductActivityExposurePublicRouteResult,
): ActivityExposureFandexVariableProductAdapterResult {
  const quality = buildActivityExposureRiskQualityMetadata(result);
  if (quality.status === 'blocked') {
    return Object.freeze({
      status: 'blocked' as const,
      reason: quality.reason,
    });
  }

  if (quality.metadata.identityState !== 'resolved') {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-identity-unresolved' as const,
    });
  }

  if (result.status !== 'ok') {
    throw new Error(
      'activity_exposure_common_adapter_quality_read_state_mismatch',
    );
  }

  const model = result.model;
  const availabilityState = quality.metadata.availabilityState;

  const availability =
    availabilityState === 'available'
      ? 'available' as const
      : availabilityState === 'source-missing'
        ? 'missing' as const
        : availabilityState === 'unsupported'
          ? 'unsupported' as const
          : 'unavailable' as const;

  const valueRepresentation =
    availability === 'available'
      ? {
          kind: 'event' as const,
          state: model.construct,
        }
      : availability === 'missing'
        ? {
            kind: 'event' as const,
            state: null,
          }
        : availability === 'unsupported'
          ? {
              kind: 'none' as const,
              reason: 'unsupported' as const,
            }
          : {
              kind: 'none' as const,
              reason: 'not-produced' as const,
            };

  const record = createFandexVariableProductRecord({
    variableId: 'comebackActivityPoint',
    canonicalArtistId: model.identity.sourceArtistId,
    lifecycleState: quality.metadata.lifecycleState,
    materialClass: quality.metadata.materialClass,
    readinessState: 'production',
    availability,
    valueRepresentation,
    asOf: null,
    observationTime: { kind: 'unknown' },
    collectionTime: null,
    confidence: quality.metadata.confidenceState,
    coverage: quality.metadata.coverageState,
    freshness: quality.metadata.freshnessState,
    missingReason:
      availability === 'missing'
        ? 'source-missing'
        : null,
    unsupportedReason:
      availability === 'unsupported'
        ? 'provider-scope-unsupported'
        : null,
    blockerReason: null,
    evidenceRefs: orderedUnique([
      ...quality.metadata.evidenceRefs,
      `contract:${quality.metadata.contractVersion}`,
      `product-contract:${quality.metadata.producerContractVersion}`,
    ]),
    methodologyVersion: quality.metadata.producerContractVersion,
    sourceVersion: quality.metadata.producerContractVersion,
    productVersion:
      ACTIVITY_EXPOSURE_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  });

  return Object.freeze({
    status: 'ok' as const,
    record,
  });
}
