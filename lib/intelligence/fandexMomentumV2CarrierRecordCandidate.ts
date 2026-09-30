import {
  FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION,
} from './fandexMomentumCategoricalOutputAttestation';
import {
  FANDEX_MOMENTUM_CARRIER_HISTORY_V2,
  type MomentumCarrierPersistenceDecision,
} from './fandexMomentumCarrierPersistenceDecision';
import type {
  FandexMomentumCurrentEvaluationExecutionResult,
} from './fandexMomentumCurrentEvaluationExecution';
import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_V2_CARRIER_RECORD_CANDIDATE_VERSION =
  'momentum-v2-carrier-record-candidate-v1' as const;

const VARIABLE_ID =
  'momentum.cross-family-evidence-state.research' as const;

type AppendPersistenceDecision = Extract<
  MomentumCarrierPersistenceDecision,
  { state: 'append-v2-carrier-candidate' }
>;

type CandidateSafety = Readonly<{
  historyWritePerformed: false;
  databaseWrites: 0;
  productMetricReads: 0;
  productMetricWrites: 0;
  previewFallbackReads: 0;
}>;

const SAFETY = Object.freeze({
  historyWritePerformed: false as const,
  databaseWrites: 0 as const,
  productMetricReads: 0 as const,
  productMetricWrites: 0 as const,
  previewFallbackReads: 0 as const,
});

export type FandexMomentumV2CarrierRecordCandidateResult =
  | Readonly<{
      contractVersion:
        typeof FANDEX_MOMENTUM_V2_CARRIER_RECORD_CANDIDATE_VERSION;
      state: 'blocked';
      reason:
        | 'execution-not-append-candidate'
        | 'sequence-invalid'
        | 'recorded-at-invalid'
        | 'recorded-before-observation';
      safety: CandidateSafety;
    }>
  | Readonly<{
      contractVersion:
        typeof FANDEX_MOMENTUM_V2_CARRIER_RECORD_CANDIDATE_VERSION;
      state: 'record-candidate';
      record: Readonly<{
        contractVersion: typeof FANDEX_MOMENTUM_CARRIER_HISTORY_V2;
        sequence: number;
        recordedAt: string;
        canonicalArtistId: string;
        alignmentCutoffAt: string;
        directionalConsensus:
          AppendPersistenceDecision['nextDirectionalConsensus'];
        persistenceConsensus:
          AppendPersistenceDecision['nextPersistenceConsensus'];
        sourceContractVersion:
          typeof FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION;
        sourceV143Digest: null;
        sourceAttestationContractVersion:
          typeof FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION;
        sourceAttestationDigest: string;
        changeKind:
          AppendPersistenceDecision['changeKind'];
        previousSourceDigest: string;
        previousRecordDigest: string;
        observation: Readonly<{
          observationId: string;
          providerId: 'fandex-derived';
          entity: Readonly<{
            entityType: 'artist';
            entityId: string;
            providerEntityId: null;
            identityState: 'canonical';
          }>;
          variable: Readonly<{
            variableId: typeof VARIABLE_ID;
            metricFamily: 'momentum';
            role: 'diagnostic';
          }>;
          value: Readonly<{
            rawValue:
              AppendPersistenceDecision['nextDirectionalConsensus'];
            unit: null;
            missingState: 'observed';
          }>;
          time: Readonly<{
            providerPeriodStart: null;
            providerPeriodEnd: string;
            observedAt: string;
            collectedAt: string;
          }>;
          evidence: Readonly<{
            evidenceRef: string;
            revision: null;
            conflictState: 'cross-family-direction-conflict' | null;
          }>;
          lifecycle: Readonly<{
            state: 'research';
            materialClass: 'real';
            blockers: readonly [];
          }>;
          contractVersion: 'fandex-observation-v1';
        }>;
        isolation: Readonly<{
          productMetricReads: 0;
          productMetricWrites: 0;
          previewFallbackReads: 0;
          databaseWrites: 0;
        }>;
        recordDigest: string;
      }>;
      safety: CandidateSafety;
    }>;

function blocked(
  reason: Extract<
    FandexMomentumV2CarrierRecordCandidateResult,
    { state: 'blocked' }
  >['reason'],
): FandexMomentumV2CarrierRecordCandidateResult {
  return Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_V2_CARRIER_RECORD_CANDIDATE_VERSION,
    state: 'blocked' as const,
    reason,
    safety: SAFETY,
  });
}

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return (
    Number.isFinite(parsed)
    && new Date(parsed).toISOString() === value
  );
}

export function buildFandexMomentumV2CarrierRecordCandidate(
  input: Readonly<{
    execution: FandexMomentumCurrentEvaluationExecutionResult;
    sequence: number;
    recordedAt: string;
  }>,
): FandexMomentumV2CarrierRecordCandidateResult {
  if (input.execution.state !== 'append-v2-carrier-candidate') {
    return blocked('execution-not-append-candidate');
  }

  if (!Number.isSafeInteger(input.sequence) || input.sequence <= 1) {
    return blocked('sequence-invalid');
  }

  if (!validIso(input.recordedAt)) {
    return blocked('recorded-at-invalid');
  }

  const decision = input.execution.persistenceDecision;
  if (decision.state !== 'append-v2-carrier-candidate') {
    return blocked('execution-not-append-candidate');
  }

  if (
    Date.parse(input.recordedAt)
      < Date.parse(decision.nextAlignmentCutoffAt)
  ) {
    return blocked('recorded-before-observation');
  }

  const conflictState =
    decision.nextDirectionalConsensus === 'direction-conflicted'
      ? 'cross-family-direction-conflict' as const
      : null;

  const observationPayload = Object.freeze({
    providerId: 'fandex-derived' as const,
    entity: Object.freeze({
      entityType: 'artist' as const,
      entityId: input.execution.attestation.canonicalArtistId,
      providerEntityId: null,
      identityState: 'canonical' as const,
    }),
    variable: Object.freeze({
      variableId: VARIABLE_ID,
      metricFamily: 'momentum' as const,
      role: 'diagnostic' as const,
    }),
    value: Object.freeze({
      rawValue: decision.nextDirectionalConsensus,
      unit: null,
      missingState: 'observed' as const,
    }),
    time: Object.freeze({
      providerPeriodStart: null,
      providerPeriodEnd: decision.nextAlignmentCutoffAt,
      observedAt: decision.nextAlignmentCutoffAt,
      collectedAt: input.recordedAt,
    }),
    evidence: Object.freeze({
      evidenceRef:
        'fandex:momentum:attestation:'
        + FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION
        + ':'
        + decision.sourceAttestationDigest,
      revision: null,
      conflictState,
    }),
    lifecycle: Object.freeze({
      state: 'research' as const,
      materialClass: 'real' as const,
      blockers: Object.freeze([]) as readonly [],
    }),
    contractVersion: 'fandex-observation-v1' as const,
  });

  const observation = Object.freeze({
    observationId: sha256Canonical(observationPayload),
    ...observationPayload,
  });

  const recordPayload = Object.freeze({
    contractVersion: FANDEX_MOMENTUM_CARRIER_HISTORY_V2,
    sequence: input.sequence,
    recordedAt: input.recordedAt,
    canonicalArtistId: input.execution.attestation.canonicalArtistId,
    alignmentCutoffAt: decision.nextAlignmentCutoffAt,
    directionalConsensus: decision.nextDirectionalConsensus,
    persistenceConsensus: decision.nextPersistenceConsensus,
    sourceContractVersion:
      FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION,
    sourceV143Digest: null,
    sourceAttestationContractVersion:
      FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION,
    sourceAttestationDigest: decision.sourceAttestationDigest,
    changeKind: decision.changeKind,
    previousSourceDigest: decision.previousSourceDigest,
    previousRecordDigest: decision.previousRecordDigest,
    observation,
    isolation: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
    }),
  });

  return Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_V2_CARRIER_RECORD_CANDIDATE_VERSION,
    state: 'record-candidate' as const,
    record: Object.freeze({
      ...recordPayload,
      recordDigest: sha256Canonical(recordPayload),
    }),
    safety: SAFETY,
  });
}
