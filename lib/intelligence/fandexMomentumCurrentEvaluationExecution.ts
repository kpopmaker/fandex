import {
  buildFandexMomentumCategoricalOutputAttestation,
  type FandexMomentumCategoricalOutputAttestation,
  type MomentumCurrentDualSourceEvaluationEvidence,
} from './fandexMomentumCategoricalOutputAttestation';
import {
  decideFandexMomentumCarrierPersistence,
  type MomentumCarrierPersistenceDecision,
  type MomentumCarrierTail,
} from './fandexMomentumCarrierPersistenceDecision';

export const FANDEX_MOMENTUM_CURRENT_EVALUATION_EXECUTION_VERSION =
  'momentum-current-evaluation-execution-v1' as const;

type ExecutionSafety = Readonly<{
  databaseMode: 'read-only';
  databaseWrites: 0;
  historyWritePerformed: false;
  productMetricReads: 0;
  productMetricWrites: 0;
  previewFallbackReads: 0;
  registryMutations: 0;
  productionActivations: 0;
}>;

const SAFETY = Object.freeze({
  databaseMode: 'read-only' as const,
  databaseWrites: 0 as const,
  historyWritePerformed: false as const,
  productMetricReads: 0 as const,
  productMetricWrites: 0 as const,
  previewFallbackReads: 0 as const,
  registryMutations: 0 as const,
  productionActivations: 0 as const,
});

export type FandexMomentumCurrentEvaluationExecutionResult =
  | Readonly<{
      contractVersion:
        typeof FANDEX_MOMENTUM_CURRENT_EVALUATION_EXECUTION_VERSION;
      state: 'blocked';
      stage: 'categorical-attestation' | 'carrier-persistence-decision';
      reason:
        | 'evaluation-identity-invalid'
        | 'naver-stored-evidence-invalid'
        | 'categorical-output-invalid'
        | 'evaluation-decision-invalid'
        | 'evaluation-isolation-invalid'
        | Extract<
            MomentumCarrierPersistenceDecision,
            { state: 'blocked' }
          >['reason'];
      safety: ExecutionSafety;
    }>
  | Readonly<{
      contractVersion:
        typeof FANDEX_MOMENTUM_CURRENT_EVALUATION_EXECUTION_VERSION;
      state: 'attested-no-op' | 'append-v2-carrier-candidate';
      attestation: FandexMomentumCategoricalOutputAttestation;
      persistenceDecision: Exclude<
        MomentumCarrierPersistenceDecision,
        { state: 'blocked' }
      >;
      safety: ExecutionSafety;
    }>;

function mapAttestationError(error: unknown):
  Extract<
    FandexMomentumCurrentEvaluationExecutionResult,
    { state: 'blocked' }
  >['reason'] {
  const message = error instanceof Error ? error.message : '';

  switch (message) {
    case 'momentum_categorical_attestation_evaluation_identity_invalid':
      return 'evaluation-identity-invalid';
    case 'momentum_categorical_attestation_naver_evidence_invalid':
      return 'naver-stored-evidence-invalid';
    case 'momentum_categorical_attestation_output_invalid':
      return 'categorical-output-invalid';
    case 'momentum_categorical_attestation_decision_invalid':
      return 'evaluation-decision-invalid';
    case 'momentum_categorical_attestation_isolation_invalid':
      return 'evaluation-isolation-invalid';
    default:
      return 'evaluation-identity-invalid';
  }
}

export function executeFandexMomentumCurrentEvaluation(
  input: Readonly<{
    currentCarrier: MomentumCarrierTail;
    evaluationEvidence: MomentumCurrentDualSourceEvaluationEvidence;
  }>,
): FandexMomentumCurrentEvaluationExecutionResult {
  let attestation: FandexMomentumCategoricalOutputAttestation;

  try {
    attestation = buildFandexMomentumCategoricalOutputAttestation(
      input.evaluationEvidence,
    );
  } catch (error) {
    return Object.freeze({
      contractVersion:
        FANDEX_MOMENTUM_CURRENT_EVALUATION_EXECUTION_VERSION,
      state: 'blocked' as const,
      stage: 'categorical-attestation' as const,
      reason: mapAttestationError(error),
      safety: SAFETY,
    });
  }

  const persistenceDecision = decideFandexMomentumCarrierPersistence({
    currentCarrier: input.currentCarrier,
    attestation,
  });

  if (persistenceDecision.state === 'blocked') {
    return Object.freeze({
      contractVersion:
        FANDEX_MOMENTUM_CURRENT_EVALUATION_EXECUTION_VERSION,
      state: 'blocked' as const,
      stage: 'carrier-persistence-decision' as const,
      reason: persistenceDecision.reason,
      safety: SAFETY,
    });
  }

  return Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_CURRENT_EVALUATION_EXECUTION_VERSION,
    state: persistenceDecision.state,
    attestation,
    persistenceDecision,
    safety: SAFETY,
  });
}
