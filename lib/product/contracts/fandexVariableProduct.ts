import {
  FANDEX_CONFIDENCE_STATES,
  type FandexConfidenceState,
} from '../../intelligence/confidence';
import {
  isFandexDataLifecycleState,
  isFandexDataMaterialClass,
  type FandexDataLifecycleState,
  type FandexDataMaterialClass,
} from '../../intelligence/productionState';
import type { ArtistStockVariableKey } from '../../../app/data/v4/charts/artistIndexChartData';
import type {
  ProductCollectionTime,
  ProductObservationTime,
} from './productTime';

export const FANDEX_VARIABLE_PRODUCT_CONTRACT_VERSION =
  'fandex-variable-product-v1' as const;

export const FANDEX_VARIABLE_PRODUCT_IDS = Object.freeze([
  'musicAlbumPoint',
  'newsIssuePoint',
  'snsFandomPoint',
  'brandFitPoint',
  'comebackActivityPoint',
  'growthMomentumPoint',
  'riskAdjustmentPoint',
] as const satisfies readonly ArtistStockVariableKey[]);

export type FandexVariableProductId =
  typeof FANDEX_VARIABLE_PRODUCT_IDS[number];

export const FANDEX_VARIABLE_PRODUCT_AVAILABILITY_STATES = Object.freeze([
  'available',
  'unavailable',
  'unsupported',
  'missing',
  'blocked',
] as const);
export type FandexVariableProductAvailabilityState =
  typeof FANDEX_VARIABLE_PRODUCT_AVAILABILITY_STATES[number];

export const FANDEX_VARIABLE_PRODUCT_READINESS_STATES = Object.freeze([
  'research-only',
  'preview-only',
  'building-history',
  'production-ready',
  'production',
  'blocked',
] as const);
export type FandexVariableProductReadinessState =
  typeof FANDEX_VARIABLE_PRODUCT_READINESS_STATES[number];

export const FANDEX_VARIABLE_PRODUCT_COVERAGE_STATES = Object.freeze([
  'complete',
  'incomplete',
  'unknown',
] as const);
export type FandexVariableProductCoverageState =
  typeof FANDEX_VARIABLE_PRODUCT_COVERAGE_STATES[number];

export const FANDEX_VARIABLE_PRODUCT_FRESHNESS_STATES = Object.freeze([
  'current',
  'stale',
  'unknown',
] as const);
export type FandexVariableProductFreshnessState =
  typeof FANDEX_VARIABLE_PRODUCT_FRESHNESS_STATES[number];

export type FandexVariableProductValueRepresentation =
  | Readonly<{
      kind: 'numeric';
      value: number | null;
      unit: string | null;
    }>
  | Readonly<{
      kind: 'categorical';
      state: string | null;
    }>
  | Readonly<{
      kind: 'event';
      state: string | null;
    }>
  | Readonly<{
      kind: 'quality';
      state: string | null;
    }>
  | Readonly<{
      kind: 'none';
      reason:
        | 'not-produced'
        | 'not-applicable'
        | 'blocked'
        | 'missing'
        | 'unsupported';
    }>;

export type FandexVariableProductRecord = Readonly<{
  contractVersion: typeof FANDEX_VARIABLE_PRODUCT_CONTRACT_VERSION;
  variableId: FandexVariableProductId;
  canonicalArtistId: string;
  lifecycleState: FandexDataLifecycleState;
  materialClass: FandexDataMaterialClass;
  readinessState: FandexVariableProductReadinessState;
  availability: FandexVariableProductAvailabilityState;
  valueRepresentation: FandexVariableProductValueRepresentation;
  asOf: string | null;
  observationTime: ProductObservationTime;
  collectionTime: ProductCollectionTime | null;
  confidence: FandexConfidenceState;
  coverage: FandexVariableProductCoverageState;
  freshness: FandexVariableProductFreshnessState;
  missingReason: string | null;
  unsupportedReason: string | null;
  blockerReason: string | null;
  evidenceRefs: readonly string[];
  methodologyVersion: string;
  sourceVersion: string;
  productVersion: string;
}>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function orderedUnique(values: readonly string[]): readonly string[] {
  if (
    values.some(
      (value) => typeof value !== 'string' || value.trim().length === 0,
    )
  ) {
    throw new Error('fandex_variable_product_evidence_ref_invalid');
  }

  return Object.freeze(
    [...new Set(values.map((value) => value.trim()))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

function validateReasons(
  availability: FandexVariableProductAvailabilityState,
  missingReason: string | null,
  unsupportedReason: string | null,
  blockerReason: string | null,
): void {
  if (availability === 'missing' && !isNonEmptyString(missingReason)) {
    throw new Error('fandex_variable_product_missing_reason_required');
  }
  if (
    availability === 'unsupported'
    && !isNonEmptyString(unsupportedReason)
  ) {
    throw new Error('fandex_variable_product_unsupported_reason_required');
  }
  if (availability === 'blocked' && !isNonEmptyString(blockerReason)) {
    throw new Error('fandex_variable_product_blocker_reason_required');
  }

  if (
    availability !== 'missing'
    && missingReason !== null
  ) {
    throw new Error('fandex_variable_product_missing_reason_unexpected');
  }
  if (
    availability !== 'unsupported'
    && unsupportedReason !== null
  ) {
    throw new Error('fandex_variable_product_unsupported_reason_unexpected');
  }
  if (
    availability !== 'blocked'
    && blockerReason !== null
  ) {
    throw new Error('fandex_variable_product_blocker_reason_unexpected');
  }
}

function validateValueRepresentation(
  availability: FandexVariableProductAvailabilityState,
  representation: FandexVariableProductValueRepresentation,
): void {
  if (representation.kind === 'numeric') {
    if (
      representation.value !== null
      && !Number.isFinite(representation.value)
    ) {
      throw new Error('fandex_variable_product_numeric_value_invalid');
    }

    if (availability === 'available' && representation.value === null) {
      throw new Error('fandex_variable_product_available_numeric_value_missing');
    }
    if (availability !== 'available' && representation.value !== null) {
      throw new Error('fandex_variable_product_unavailable_numeric_value_present');
    }
    if (
      representation.unit !== null
      && !isNonEmptyString(representation.unit)
    ) {
      throw new Error('fandex_variable_product_numeric_unit_invalid');
    }
    return;
  }

  if (
    representation.kind === 'categorical'
    || representation.kind === 'event'
    || representation.kind === 'quality'
  ) {
    if (
      availability === 'available'
      && !isNonEmptyString(representation.state)
    ) {
      throw new Error('fandex_variable_product_available_state_missing');
    }
    if (
      availability !== 'available'
      && representation.state !== null
    ) {
      throw new Error('fandex_variable_product_unavailable_state_present');
    }
    return;
  }

  if (availability === 'available') {
    throw new Error('fandex_variable_product_available_representation_missing');
  }
}

export function createFandexVariableProductRecord(
  input: Omit<FandexVariableProductRecord, 'contractVersion'>,
): FandexVariableProductRecord {
  if (
    !FANDEX_VARIABLE_PRODUCT_IDS.includes(
      input.variableId as FandexVariableProductId,
    )
  ) {
    throw new Error('fandex_variable_product_variable_id_invalid');
  }
  if (!isNonEmptyString(input.canonicalArtistId)) {
    throw new Error('fandex_variable_product_artist_id_invalid');
  }
  if (!isFandexDataLifecycleState(input.lifecycleState)) {
    throw new Error('fandex_variable_product_lifecycle_state_invalid');
  }
  if (!isFandexDataMaterialClass(input.materialClass)) {
    throw new Error('fandex_variable_product_material_class_invalid');
  }
  if (
    input.lifecycleState === 'production'
    && input.materialClass !== 'real'
  ) {
    throw new Error('fandex_variable_product_production_material_invalid');
  }
  if (
    !FANDEX_VARIABLE_PRODUCT_READINESS_STATES.includes(
      input.readinessState,
    )
  ) {
    throw new Error('fandex_variable_product_readiness_state_invalid');
  }
  if (
    !FANDEX_VARIABLE_PRODUCT_AVAILABILITY_STATES.includes(
      input.availability,
    )
  ) {
    throw new Error('fandex_variable_product_availability_invalid');
  }
  if (
    !FANDEX_CONFIDENCE_STATES.includes(input.confidence)
  ) {
    throw new Error('fandex_variable_product_confidence_invalid');
  }
  if (
    !FANDEX_VARIABLE_PRODUCT_COVERAGE_STATES.includes(input.coverage)
  ) {
    throw new Error('fandex_variable_product_coverage_invalid');
  }
  if (
    !FANDEX_VARIABLE_PRODUCT_FRESHNESS_STATES.includes(input.freshness)
  ) {
    throw new Error('fandex_variable_product_freshness_invalid');
  }
  if (input.asOf !== null && !isNonEmptyString(input.asOf)) {
    throw new Error('fandex_variable_product_as_of_invalid');
  }
  if (
    input.collectionTime !== null
    && !isNonEmptyString(input.collectionTime.collectedAt)
  ) {
    throw new Error('fandex_variable_product_collection_time_invalid');
  }

  for (const [name, value] of [
    ['methodology', input.methodologyVersion],
    ['source', input.sourceVersion],
    ['product', input.productVersion],
  ] as const) {
    if (!isNonEmptyString(value)) {
      throw new Error(`fandex_variable_product_${name}_version_invalid`);
    }
  }

  validateReasons(
    input.availability,
    input.missingReason,
    input.unsupportedReason,
    input.blockerReason,
  );
  validateValueRepresentation(
    input.availability,
    input.valueRepresentation,
  );

  return Object.freeze({
    ...input,
    contractVersion: FANDEX_VARIABLE_PRODUCT_CONTRACT_VERSION,
    canonicalArtistId: input.canonicalArtistId.trim(),
    evidenceRefs: orderedUnique(input.evidenceRefs),
    methodologyVersion: input.methodologyVersion.trim(),
    sourceVersion: input.sourceVersion.trim(),
    productVersion: input.productVersion.trim(),
  });
}
