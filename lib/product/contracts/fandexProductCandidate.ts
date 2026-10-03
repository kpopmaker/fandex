import type { FandexConfidenceState } from '../../intelligence/confidence';
import {
  FANDEX_CANDIDATE_ELIGIBILITY_PENDING_REASON,
  type FandexArtistAvailabilityMatrixRow,
} from './fandexArtistAvailabilityMatrix';
import {
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductCoverageState,
  type FandexVariableProductFreshnessState,
  type FandexVariableProductId,
  type FandexVariableProductRecord,
} from './fandexVariableProduct';
import {
  FANDEX_VARIABLE_PRODUCT_SNAPSHOT_CONTRACT_VERSION,
  type FandexVariableProductSnapshot,
} from './fandexVariableProductSnapshot';

export const FANDEX_PRODUCT_CANDIDATE_CONTRACT_VERSION =
  'fandex-product-candidate-v1' as const;

export const FANDEX_PRODUCT_CANDIDATE_STATE =
  'awaiting-methodology' as const;

export type FandexProductCandidateComponentAvailability = Readonly<{
  variableSupported: boolean | null;
  supportReason: string;
  variableProductionAvailable: boolean;
  productionAvailabilityReason: string;
}>;

export type FandexProductCandidateComponent = Readonly<{
  variableId: FandexVariableProductId;
  record: FandexVariableProductRecord;
  availability: FandexProductCandidateComponentAvailability;
  evidenceRefs: readonly string[];
}>;

export type FandexProductCandidateCoverage = Readonly<{
  byVariable: Readonly<Record<
    FandexVariableProductId,
    FandexVariableProductCoverageState
  >>;
  productionAvailableComponentCount: number;
  totalComponentCount: number;
  aggregate: null;
}>;

export type FandexProductCandidateConfidence = Readonly<{
  byVariable: Readonly<Record<
    FandexVariableProductId,
    FandexConfidenceState
  >>;
  aggregate: null;
}>;

export type FandexProductCandidateFreshness = Readonly<{
  byVariable: Readonly<Record<
    FandexVariableProductId,
    FandexVariableProductFreshnessState
  >>;
  aggregate: null;
}>;

export type FandexProductCandidate = Readonly<{
  contractVersion: typeof FANDEX_PRODUCT_CANDIDATE_CONTRACT_VERSION;
  canonicalArtistId: string;
  state: typeof FANDEX_PRODUCT_CANDIDATE_STATE;
  fandexValue: null;
  fandexCandidateEligible: null;
  candidateEligibilityReason:
    typeof FANDEX_CANDIDATE_ELIGIBILITY_PENDING_REASON;
  components: readonly FandexProductCandidateComponent[];
  componentAvailability: Readonly<Record<
    FandexVariableProductId,
    FandexProductCandidateComponentAvailability
  >>;
  coverage: FandexProductCandidateCoverage;
  confidence: FandexProductCandidateConfidence;
  freshness: FandexProductCandidateFreshness;
  evidenceRefs: readonly string[];
  methodologyVersion: null;
}>;

function orderedUnique(values: readonly string[]): readonly string[] {
  if (
    values.some(
      (value) => typeof value !== 'string' || value.trim().length === 0,
    )
  ) {
    throw new Error('fandex_product_candidate_evidence_ref_invalid');
  }

  return Object.freeze(
    [...new Set(values.map((value) => value.trim()))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

function assertMatrixCellMatchesRecord(
  variableId: FandexVariableProductId,
  record: FandexVariableProductRecord,
  row: FandexArtistAvailabilityMatrixRow,
): void {
  const cell = row.variables[variableId];

  if (cell.variableId !== variableId) {
    throw new Error(
      `fandex_product_candidate_matrix_variable_mismatch:${variableId}`,
    );
  }

  const pairs: readonly [unknown, unknown, string][] = [
    [cell.productAvailability, record.availability, 'availability'],
    [cell.readinessState, record.readinessState, 'readiness'],
    [cell.lifecycleState, record.lifecycleState, 'lifecycle'],
    [cell.materialClass, record.materialClass, 'material'],
    [cell.confidence, record.confidence, 'confidence'],
    [cell.coverage, record.coverage, 'coverage'],
    [cell.freshness, record.freshness, 'freshness'],
  ];

  for (const [matrixValue, recordValue, dimension] of pairs) {
    if (matrixValue !== recordValue) {
      throw new Error(
        `fandex_product_candidate_matrix_${dimension}_mismatch:${variableId}`,
      );
    }
  }
}

export function createFandexProductCandidate(input: Readonly<{
  snapshot: FandexVariableProductSnapshot;
  availabilityRow: FandexArtistAvailabilityMatrixRow;
}>): FandexProductCandidate {
  if (
    input.snapshot.contractVersion
      !== FANDEX_VARIABLE_PRODUCT_SNAPSHOT_CONTRACT_VERSION
  ) {
    throw new Error('fandex_product_candidate_snapshot_contract_invalid');
  }

  const canonicalArtistId = input.snapshot.canonicalArtistId.trim();
  if (!canonicalArtistId) {
    throw new Error('fandex_product_candidate_artist_id_invalid');
  }

  if (input.availabilityRow.canonicalArtistId.trim() !== canonicalArtistId) {
    throw new Error('fandex_product_candidate_artist_identity_mismatch');
  }

  if (input.availabilityRow.artistKnown !== true) {
    throw new Error('fandex_product_candidate_artist_not_known');
  }

  if (
    input.availabilityRow.fandexCandidateEligible !== null
    || input.availabilityRow.candidateEligibilityReason
      !== FANDEX_CANDIDATE_ELIGIBILITY_PENDING_REASON
  ) {
    throw new Error(
      'fandex_product_candidate_eligibility_boundary_invalid',
    );
  }

  const recordsByVariable = new Map<
    FandexVariableProductId,
    FandexVariableProductRecord
  >(
    input.snapshot.records.map((record) => [record.variableId, record]),
  );

  const componentAvailabilityEntries: [
    FandexVariableProductId,
    FandexProductCandidateComponentAvailability,
  ][] = [];
  const coverageEntries: [
    FandexVariableProductId,
    FandexVariableProductCoverageState,
  ][] = [];
  const confidenceEntries: [
    FandexVariableProductId,
    FandexConfidenceState,
  ][] = [];
  const freshnessEntries: [
    FandexVariableProductId,
    FandexVariableProductFreshnessState,
  ][] = [];

  let productionAvailableComponentCount = 0;
  const allEvidenceRefs: string[] = [];

  const components = FANDEX_VARIABLE_PRODUCT_IDS.map(
    (variableId): FandexProductCandidateComponent => {
      const record = recordsByVariable.get(variableId);
      if (!record) {
        throw new Error(
          `fandex_product_candidate_component_missing:${variableId}`,
        );
      }

      assertMatrixCellMatchesRecord(
        variableId,
        record,
        input.availabilityRow,
      );

      const matrixCell = input.availabilityRow.variables[variableId];
      const availability = Object.freeze({
        variableSupported: matrixCell.variableSupported,
        supportReason: matrixCell.supportReason,
        variableProductionAvailable:
          matrixCell.variableProductionAvailable,
        productionAvailabilityReason:
          matrixCell.productionAvailabilityReason,
      });

      if (availability.variableProductionAvailable) {
        productionAvailableComponentCount += 1;
      }

      const evidenceRefs = orderedUnique([
        ...record.evidenceRefs,
        ...matrixCell.evidenceRefs,
      ]);
      allEvidenceRefs.push(...evidenceRefs);

      componentAvailabilityEntries.push([variableId, availability]);
      coverageEntries.push([variableId, record.coverage]);
      confidenceEntries.push([variableId, record.confidence]);
      freshnessEntries.push([variableId, record.freshness]);

      return Object.freeze({
        variableId,
        record,
        availability,
        evidenceRefs,
      });
    },
  );

  return Object.freeze({
    contractVersion: FANDEX_PRODUCT_CANDIDATE_CONTRACT_VERSION,
    canonicalArtistId,
    state: FANDEX_PRODUCT_CANDIDATE_STATE,
    fandexValue: null,
    fandexCandidateEligible: null,
    candidateEligibilityReason:
      FANDEX_CANDIDATE_ELIGIBILITY_PENDING_REASON,
    components: Object.freeze(components),
    componentAvailability: Object.freeze(
      Object.fromEntries(componentAvailabilityEntries),
    ) as Readonly<Record<
      FandexVariableProductId,
      FandexProductCandidateComponentAvailability
    >>,
    coverage: Object.freeze({
      byVariable: Object.freeze(
        Object.fromEntries(coverageEntries),
      ) as Readonly<Record<
        FandexVariableProductId,
        FandexVariableProductCoverageState
      >>,
      productionAvailableComponentCount,
      totalComponentCount: FANDEX_VARIABLE_PRODUCT_IDS.length,
      aggregate: null,
    }),
    confidence: Object.freeze({
      byVariable: Object.freeze(
        Object.fromEntries(confidenceEntries),
      ) as Readonly<Record<
        FandexVariableProductId,
        FandexConfidenceState
      >>,
      aggregate: null,
    }),
    freshness: Object.freeze({
      byVariable: Object.freeze(
        Object.fromEntries(freshnessEntries),
      ) as Readonly<Record<
        FandexVariableProductId,
        FandexVariableProductFreshnessState
      >>,
      aggregate: null,
    }),
    evidenceRefs: orderedUnique(allEvidenceRefs),
    methodologyVersion: null,
  });
}
