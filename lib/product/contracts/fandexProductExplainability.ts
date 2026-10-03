import type {
  FandexVariableProductId,
  FandexVariableProductRecord,
} from './fandexVariableProduct';
import {
  FANDEX_VARIABLE_PRODUCT_IDS,
} from './fandexVariableProduct';
import {
  FANDEX_PRODUCT_CANDIDATE_CONTRACT_VERSION,
  FANDEX_PRODUCT_CANDIDATE_STATE,
  type FandexProductCandidate,
  type FandexProductCandidateComponentAvailability,
} from './fandexProductCandidate';

export const FANDEX_PRODUCT_EXPLAINABILITY_CONTRACT_VERSION =
  'fandex-product-explainability-v1' as const;

export const FANDEX_PRODUCT_EXPLAINABILITY_STATE =
  'component-evidence-only' as const;

export const FANDEX_PRODUCT_EXPLAINABILITY_LIMITATIONS = Object.freeze([
  'final-methodology-not-established',
  'fandex-value-not-calculated',
  'aggregate-interpretation-not-established',
] as const);

export type FandexProductExplainabilityReasonSet = Readonly<{
  supportReason: string;
  productionAvailabilityReason: string;
  missingReason: string | null;
  unsupportedReason: string | null;
  blockerReason: string | null;
}>;

export type FandexProductExplainabilityTime = Readonly<{
  asOf: string | null;
  observationTime: FandexVariableProductRecord['observationTime'];
  collectionTime: FandexVariableProductRecord['collectionTime'];
}>;

export type FandexProductExplainabilityVersionSet = Readonly<{
  methodologyVersion: string;
  sourceVersion: string;
  productVersion: string;
}>;

export type FandexProductComponentExplanation = Readonly<{
  variableId: FandexVariableProductId;
  valueRepresentation: FandexVariableProductRecord['valueRepresentation'];
  availability: FandexVariableProductRecord['availability'];
  support: Readonly<{
    variableSupported: boolean | null;
    reason: string;
  }>;
  productionAvailability: Readonly<{
    available: boolean;
    reason: string;
  }>;
  lifecycleState: FandexVariableProductRecord['lifecycleState'];
  materialClass: FandexVariableProductRecord['materialClass'];
  readinessState: FandexVariableProductRecord['readinessState'];
  confidence: FandexVariableProductRecord['confidence'];
  coverage: FandexVariableProductRecord['coverage'];
  freshness: FandexVariableProductRecord['freshness'];
  time: FandexProductExplainabilityTime;
  reasons: FandexProductExplainabilityReasonSet;
  evidenceRefs: readonly string[];
  versions: FandexProductExplainabilityVersionSet;
}>;

export type FandexProductExplainabilitySummary = Readonly<{
  totalComponentCount: number;
  productionAvailableComponentCount: number;
  productionUnavailableComponentIds: readonly FandexVariableProductId[];
  supportUnknownComponentIds: readonly FandexVariableProductId[];
  unsupportedComponentIds: readonly FandexVariableProductId[];
  missingComponentIds: readonly FandexVariableProductId[];
  blockedComponentIds: readonly FandexVariableProductId[];
  staleComponentIds: readonly FandexVariableProductId[];
  incompleteOrUnknownCoverageComponentIds: readonly FandexVariableProductId[];
  lowOrInsufficientConfidenceComponentIds: readonly FandexVariableProductId[];
}>;

export type FandexProductExplainability = Readonly<{
  contractVersion: typeof FANDEX_PRODUCT_EXPLAINABILITY_CONTRACT_VERSION;
  canonicalArtistId: string;
  state: typeof FANDEX_PRODUCT_EXPLAINABILITY_STATE;
  fandexValue: null;
  fandexCandidateEligible: null;
  candidateState: typeof FANDEX_PRODUCT_CANDIDATE_STATE;
  components: readonly FandexProductComponentExplanation[];
  byVariable: Readonly<Record<
    FandexVariableProductId,
    FandexProductComponentExplanation
  >>;
  summary: FandexProductExplainabilitySummary;
  evidenceRefs: readonly string[];
  limitations: typeof FANDEX_PRODUCT_EXPLAINABILITY_LIMITATIONS;
  methodologyVersion: null;
}>;

function orderedUniqueStrings(
  values: readonly string[],
  errorCode: string,
): readonly string[] {
  if (
    values.some(
      (value) => typeof value !== 'string' || value.trim().length === 0,
    )
  ) {
    throw new Error(errorCode);
  }

  return Object.freeze(
    [...new Set(values.map((value) => value.trim()))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

function orderedVariableIds(
  ids: readonly FandexVariableProductId[],
): readonly FandexVariableProductId[] {
  const selected = new Set(ids);
  return Object.freeze(
    FANDEX_VARIABLE_PRODUCT_IDS.filter((variableId) =>
      selected.has(variableId)),
  );
}

function assertAvailabilityProjection(
  variableId: FandexVariableProductId,
  componentAvailability: FandexProductCandidateComponentAvailability,
  candidateAvailability: FandexProductCandidate['componentAvailability'],
): void {
  const projected = candidateAvailability[variableId];

  if (
    projected.variableSupported !== componentAvailability.variableSupported
    || projected.supportReason !== componentAvailability.supportReason
    || projected.variableProductionAvailable
      !== componentAvailability.variableProductionAvailable
    || projected.productionAvailabilityReason
      !== componentAvailability.productionAvailabilityReason
  ) {
    throw new Error(
      `fandex_product_explainability_availability_mismatch:${variableId}`,
    );
  }
}

export function createFandexProductExplainability(
  candidate: FandexProductCandidate,
): FandexProductExplainability {
  if (
    candidate.contractVersion !== FANDEX_PRODUCT_CANDIDATE_CONTRACT_VERSION
  ) {
    throw new Error('fandex_product_explainability_candidate_contract_invalid');
  }

  if (candidate.state !== FANDEX_PRODUCT_CANDIDATE_STATE) {
    throw new Error('fandex_product_explainability_candidate_state_invalid');
  }

  const canonicalArtistId = candidate.canonicalArtistId.trim();
  if (!canonicalArtistId) {
    throw new Error('fandex_product_explainability_artist_id_invalid');
  }

  if (
    candidate.fandexValue !== null
    || candidate.fandexCandidateEligible !== null
    || candidate.methodologyVersion !== null
    || candidate.coverage.aggregate !== null
    || candidate.confidence.aggregate !== null
    || candidate.freshness.aggregate !== null
  ) {
    throw new Error('fandex_product_explainability_methodology_boundary_invalid');
  }

  if (candidate.components.length !== FANDEX_VARIABLE_PRODUCT_IDS.length) {
    throw new Error('fandex_product_explainability_component_count_invalid');
  }

  const seen = new Set<FandexVariableProductId>();
  const allEvidenceRefs: string[] = [];
  const productionUnavailableComponentIds: FandexVariableProductId[] = [];
  const supportUnknownComponentIds: FandexVariableProductId[] = [];
  const unsupportedComponentIds: FandexVariableProductId[] = [];
  const missingComponentIds: FandexVariableProductId[] = [];
  const blockedComponentIds: FandexVariableProductId[] = [];
  const staleComponentIds: FandexVariableProductId[] = [];
  const incompleteOrUnknownCoverageComponentIds: FandexVariableProductId[] = [];
  const lowOrInsufficientConfidenceComponentIds: FandexVariableProductId[] = [];

  const byVariableEntries: [
    FandexVariableProductId,
    FandexProductComponentExplanation,
  ][] = [];

  for (const component of candidate.components) {
    const variableId = component.variableId;

    if (seen.has(variableId)) {
      throw new Error(
        `fandex_product_explainability_duplicate_component:${variableId}`,
      );
    }
    seen.add(variableId);

    if (component.record.variableId !== variableId) {
      throw new Error(
        `fandex_product_explainability_record_variable_mismatch:${variableId}`,
      );
    }
    if (component.record.canonicalArtistId.trim() !== canonicalArtistId) {
      throw new Error(
        `fandex_product_explainability_artist_identity_mismatch:${variableId}`,
      );
    }

    assertAvailabilityProjection(
      variableId,
      component.availability,
      candidate.componentAvailability,
    );

    const evidenceRefs = orderedUniqueStrings(
      component.evidenceRefs,
      'fandex_product_explainability_evidence_ref_invalid',
    );
    allEvidenceRefs.push(...evidenceRefs);

    if (!component.availability.variableProductionAvailable) {
      productionUnavailableComponentIds.push(variableId);
    }
    if (component.availability.variableSupported === null) {
      supportUnknownComponentIds.push(variableId);
    }
    if (component.availability.variableSupported === false) {
      unsupportedComponentIds.push(variableId);
    }
    if (component.record.availability === 'missing') {
      missingComponentIds.push(variableId);
    }
    if (
      component.record.availability === 'blocked'
      || component.record.lifecycleState === 'blocked'
      || component.record.readinessState === 'blocked'
    ) {
      blockedComponentIds.push(variableId);
    }
    if (component.record.freshness === 'stale') {
      staleComponentIds.push(variableId);
    }
    if (component.record.coverage !== 'complete') {
      incompleteOrUnknownCoverageComponentIds.push(variableId);
    }
    if (
      component.record.confidence === 'low'
      || component.record.confidence === 'insufficient'
    ) {
      lowOrInsufficientConfidenceComponentIds.push(variableId);
    }

    const explanation: FandexProductComponentExplanation = Object.freeze({
      variableId,
      valueRepresentation: component.record.valueRepresentation,
      availability: component.record.availability,
      support: Object.freeze({
        variableSupported: component.availability.variableSupported,
        reason: component.availability.supportReason,
      }),
      productionAvailability: Object.freeze({
        available: component.availability.variableProductionAvailable,
        reason: component.availability.productionAvailabilityReason,
      }),
      lifecycleState: component.record.lifecycleState,
      materialClass: component.record.materialClass,
      readinessState: component.record.readinessState,
      confidence: component.record.confidence,
      coverage: component.record.coverage,
      freshness: component.record.freshness,
      time: Object.freeze({
        asOf: component.record.asOf,
        observationTime: component.record.observationTime,
        collectionTime: component.record.collectionTime,
      }),
      reasons: Object.freeze({
        supportReason: component.availability.supportReason,
        productionAvailabilityReason:
          component.availability.productionAvailabilityReason,
        missingReason: component.record.missingReason,
        unsupportedReason: component.record.unsupportedReason,
        blockerReason: component.record.blockerReason,
      }),
      evidenceRefs,
      versions: Object.freeze({
        methodologyVersion: component.record.methodologyVersion,
        sourceVersion: component.record.sourceVersion,
        productVersion: component.record.productVersion,
      }),
    });

    byVariableEntries.push([variableId, explanation]);
  }

  for (const variableId of FANDEX_VARIABLE_PRODUCT_IDS) {
    if (!seen.has(variableId)) {
      throw new Error(
        `fandex_product_explainability_component_missing:${variableId}`,
      );
    }
  }

  const byVariable = Object.freeze(
    Object.fromEntries(byVariableEntries),
  ) as Readonly<Record<
    FandexVariableProductId,
    FandexProductComponentExplanation
  >>;

  const components = Object.freeze(
    FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) => byVariable[variableId]),
  );

  return Object.freeze({
    contractVersion: FANDEX_PRODUCT_EXPLAINABILITY_CONTRACT_VERSION,
    canonicalArtistId,
    state: FANDEX_PRODUCT_EXPLAINABILITY_STATE,
    fandexValue: null,
    fandexCandidateEligible: null,
    candidateState: FANDEX_PRODUCT_CANDIDATE_STATE,
    components,
    byVariable,
    summary: Object.freeze({
      totalComponentCount: FANDEX_VARIABLE_PRODUCT_IDS.length,
      productionAvailableComponentCount:
        candidate.coverage.productionAvailableComponentCount,
      productionUnavailableComponentIds:
        orderedVariableIds(productionUnavailableComponentIds),
      supportUnknownComponentIds:
        orderedVariableIds(supportUnknownComponentIds),
      unsupportedComponentIds:
        orderedVariableIds(unsupportedComponentIds),
      missingComponentIds:
        orderedVariableIds(missingComponentIds),
      blockedComponentIds:
        orderedVariableIds(blockedComponentIds),
      staleComponentIds:
        orderedVariableIds(staleComponentIds),
      incompleteOrUnknownCoverageComponentIds:
        orderedVariableIds(incompleteOrUnknownCoverageComponentIds),
      lowOrInsufficientConfidenceComponentIds:
        orderedVariableIds(lowOrInsufficientConfidenceComponentIds),
    }),
    evidenceRefs: orderedUniqueStrings(
      allEvidenceRefs,
      'fandex_product_explainability_evidence_ref_invalid',
    ),
    limitations: FANDEX_PRODUCT_EXPLAINABILITY_LIMITATIONS,
    methodologyVersion: null,
  });
}
