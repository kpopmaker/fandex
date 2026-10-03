import type { ProductGeneratedTime } from './productTime';
import {
  FANDEX_PRODUCT_CANDIDATE_CONTRACT_VERSION,
  FANDEX_PRODUCT_CANDIDATE_STATE,
  type FandexProductCandidate,
} from './fandexProductCandidate';
import {
  FANDEX_PRODUCT_EXPLAINABILITY_CONTRACT_VERSION,
  FANDEX_PRODUCT_EXPLAINABILITY_STATE,
  type FandexProductComponentExplanation,
  type FandexProductExplainability,
  type FandexProductExplainabilitySummary,
} from './fandexProductExplainability';
import {
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
} from './fandexVariableProduct';

export const FANDEX_PRODUCT_READ_MODEL_CONTRACT_VERSION =
  'fandex-product-read-model-v1' as const;

export const FANDEX_PRODUCT_INTERNAL_API_CONTRACT_VERSION =
  'fandex-product-internal-api-v1' as const;

export const FANDEX_PRODUCT_READ_MODEL_AUDIENCE = 'internal' as const;

export type FandexProductReadModel = Readonly<{
  contractVersion: typeof FANDEX_PRODUCT_READ_MODEL_CONTRACT_VERSION;
  audience: typeof FANDEX_PRODUCT_READ_MODEL_AUDIENCE;
  canonicalArtistId: string;
  generatedTime: ProductGeneratedTime;
  state: typeof FANDEX_PRODUCT_CANDIDATE_STATE;
  explainabilityState: typeof FANDEX_PRODUCT_EXPLAINABILITY_STATE;
  fandexValue: null;
  fandexCandidateEligible: null;
  candidateEligibilityReason: string;
  components: readonly FandexProductComponentExplanation[];
  byVariable: Readonly<Record<
    FandexVariableProductId,
    FandexProductComponentExplanation
  >>;
  summary: FandexProductExplainabilitySummary;
  evidenceRefs: readonly string[];
  limitations: FandexProductExplainability['limitations'];
  sourceContracts: Readonly<{
    candidate: typeof FANDEX_PRODUCT_CANDIDATE_CONTRACT_VERSION;
    explainability: typeof FANDEX_PRODUCT_EXPLAINABILITY_CONTRACT_VERSION;
  }>;
  methodologyVersion: null;
}>;

export type FandexProductInternalApiDataIssueReason =
  | 'artist-not-known'
  | 'product-candidate-unavailable'
  | 'source-contract-invalid'
  | 'source-inconsistent';

export type FandexProductInternalApiResult =
  | Readonly<{
      contractVersion: typeof FANDEX_PRODUCT_INTERNAL_API_CONTRACT_VERSION;
      status: 'ok';
      model: FandexProductReadModel;
    }>
  | Readonly<{
      contractVersion: typeof FANDEX_PRODUCT_INTERNAL_API_CONTRACT_VERSION;
      status: 'data-issue';
      reason: FandexProductInternalApiDataIssueReason;
      details: readonly string[];
    }>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function orderedUniqueStrings(
  values: readonly string[],
  errorCode: string,
): readonly string[] {
  if (values.some((value) => !isNonEmptyString(value))) {
    throw new Error(errorCode);
  }

  return Object.freeze(
    [...new Set(values.map((value) => value.trim()))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

function sameOrderedStrings(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

export function createFandexProductReadModel(input: Readonly<{
  candidate: FandexProductCandidate;
  explainability: FandexProductExplainability;
  generatedAt: string;
}>): FandexProductReadModel {
  if (
    input.candidate.contractVersion
      !== FANDEX_PRODUCT_CANDIDATE_CONTRACT_VERSION
  ) {
    throw new Error('fandex_product_read_model_candidate_contract_invalid');
  }
  if (
    input.explainability.contractVersion
      !== FANDEX_PRODUCT_EXPLAINABILITY_CONTRACT_VERSION
  ) {
    throw new Error(
      'fandex_product_read_model_explainability_contract_invalid',
    );
  }
  if (input.candidate.state !== FANDEX_PRODUCT_CANDIDATE_STATE) {
    throw new Error('fandex_product_read_model_candidate_state_invalid');
  }
  if (
    input.explainability.state !== FANDEX_PRODUCT_EXPLAINABILITY_STATE
  ) {
    throw new Error(
      'fandex_product_read_model_explainability_state_invalid',
    );
  }

  const canonicalArtistId = input.candidate.canonicalArtistId.trim();
  if (!canonicalArtistId) {
    throw new Error('fandex_product_read_model_artist_id_invalid');
  }
  if (
    input.explainability.canonicalArtistId.trim() !== canonicalArtistId
  ) {
    throw new Error('fandex_product_read_model_artist_identity_mismatch');
  }
  if (!isNonEmptyString(input.generatedAt)) {
    throw new Error('fandex_product_read_model_generated_at_invalid');
  }

  if (
    input.candidate.fandexValue !== null
    || input.explainability.fandexValue !== null
    || input.candidate.fandexCandidateEligible !== null
    || input.explainability.fandexCandidateEligible !== null
    || input.candidate.methodologyVersion !== null
    || input.explainability.methodologyVersion !== null
  ) {
    throw new Error('fandex_product_read_model_methodology_boundary_invalid');
  }

  if (
    input.explainability.candidateState !== input.candidate.state
    || input.explainability.summary.productionAvailableComponentCount
      !== input.candidate.coverage.productionAvailableComponentCount
    || input.explainability.summary.totalComponentCount
      !== input.candidate.coverage.totalComponentCount
  ) {
    throw new Error('fandex_product_read_model_source_inconsistent');
  }

  if (
    input.explainability.components.length
      !== FANDEX_VARIABLE_PRODUCT_IDS.length
  ) {
    throw new Error('fandex_product_read_model_component_count_invalid');
  }

  for (const variableId of FANDEX_VARIABLE_PRODUCT_IDS) {
    const explanation = input.explainability.byVariable[variableId];
    const candidateComponent = input.candidate.components.find(
      (component) => component.variableId === variableId,
    );

    if (!explanation || explanation.variableId !== variableId) {
      throw new Error(
        `fandex_product_read_model_explanation_missing:${variableId}`,
      );
    }
    if (!candidateComponent) {
      throw new Error(
        `fandex_product_read_model_candidate_component_missing:${variableId}`,
      );
    }
    if (
      explanation.availability !== candidateComponent.record.availability
      || explanation.lifecycleState
        !== candidateComponent.record.lifecycleState
      || explanation.materialClass !== candidateComponent.record.materialClass
      || explanation.readinessState
        !== candidateComponent.record.readinessState
      || explanation.confidence !== candidateComponent.record.confidence
      || explanation.coverage !== candidateComponent.record.coverage
      || explanation.freshness !== candidateComponent.record.freshness
      || explanation.productionAvailability.available
        !== candidateComponent.availability.variableProductionAvailable
      || explanation.support.variableSupported
        !== candidateComponent.availability.variableSupported
    ) {
      throw new Error(
        `fandex_product_read_model_component_inconsistent:${variableId}`,
      );
    }
  }

  const candidateEvidence = orderedUniqueStrings(
    input.candidate.evidenceRefs,
    'fandex_product_read_model_candidate_evidence_invalid',
  );
  const explainabilityEvidence = orderedUniqueStrings(
    input.explainability.evidenceRefs,
    'fandex_product_read_model_explainability_evidence_invalid',
  );

  if (!sameOrderedStrings(candidateEvidence, explainabilityEvidence)) {
    throw new Error('fandex_product_read_model_evidence_inconsistent');
  }

  return Object.freeze({
    contractVersion: FANDEX_PRODUCT_READ_MODEL_CONTRACT_VERSION,
    audience: FANDEX_PRODUCT_READ_MODEL_AUDIENCE,
    canonicalArtistId,
    generatedTime: Object.freeze({
      generatedAt: input.generatedAt.trim(),
    }),
    state: FANDEX_PRODUCT_CANDIDATE_STATE,
    explainabilityState: FANDEX_PRODUCT_EXPLAINABILITY_STATE,
    fandexValue: null,
    fandexCandidateEligible: null,
    candidateEligibilityReason:
      input.candidate.candidateEligibilityReason,
    components: input.explainability.components,
    byVariable: input.explainability.byVariable,
    summary: input.explainability.summary,
    evidenceRefs: explainabilityEvidence,
    limitations: input.explainability.limitations,
    sourceContracts: Object.freeze({
      candidate: FANDEX_PRODUCT_CANDIDATE_CONTRACT_VERSION,
      explainability: FANDEX_PRODUCT_EXPLAINABILITY_CONTRACT_VERSION,
    }),
    methodologyVersion: null,
  });
}

export function createFandexProductInternalApiOk(
  model: FandexProductReadModel,
): FandexProductInternalApiResult {
  if (
    model.contractVersion !== FANDEX_PRODUCT_READ_MODEL_CONTRACT_VERSION
    || model.audience !== FANDEX_PRODUCT_READ_MODEL_AUDIENCE
  ) {
    throw new Error('fandex_product_internal_api_read_model_invalid');
  }

  return Object.freeze({
    contractVersion: FANDEX_PRODUCT_INTERNAL_API_CONTRACT_VERSION,
    status: 'ok' as const,
    model,
  });
}

export function createFandexProductInternalApiDataIssue(input: Readonly<{
  reason: FandexProductInternalApiDataIssueReason;
  details?: readonly string[];
}>): FandexProductInternalApiResult {
  const reasons: readonly FandexProductInternalApiDataIssueReason[] = [
    'artist-not-known',
    'product-candidate-unavailable',
    'source-contract-invalid',
    'source-inconsistent',
  ];

  if (!reasons.includes(input.reason)) {
    throw new Error('fandex_product_internal_api_reason_invalid');
  }

  return Object.freeze({
    contractVersion: FANDEX_PRODUCT_INTERNAL_API_CONTRACT_VERSION,
    status: 'data-issue' as const,
    reason: input.reason,
    details: orderedUniqueStrings(
      input.details ?? [],
      'fandex_product_internal_api_detail_invalid',
    ),
  });
}
