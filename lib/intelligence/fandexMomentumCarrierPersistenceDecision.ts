import {
  FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION,
  type FandexMomentumCategoricalOutputAttestation,
} from './fandexMomentumCategoricalOutputAttestation';
import { sha256Canonical } from '../shared/canonicalDigest';

export const FANDEX_MOMENTUM_CARRIER_PERSISTENCE_DECISION_VERSION =
  'momentum-carrier-persistence-decision-v1' as const;

export const FANDEX_MOMENTUM_CARRIER_HISTORY_V2 =
  'v147_fandex_momentum_unified_history_research_v2' as const;

const LEGACY_SOURCE_CONTRACT =
  'v143_fandex_momentum_output_form_eligibility_research_v1' as const;

type DirectionalConsensus =
  FandexMomentumCategoricalOutputAttestation[
    'categoricalOutput'
  ]['directionalConsensus'];

type PersistenceConsensus =
  FandexMomentumCategoricalOutputAttestation[
    'categoricalOutput'
  ]['persistenceConsensus'];

type NoOpClassification =
  | 'attested-no-op-same-cutoff-same-state'
  | 'attested-no-op-cutoff-advanced-same-state';

type AppendClassification =
  | 'new-carrier-direction-state-changed'
  | 'new-carrier-persistence-state-changed'
  | 'new-carrier-direction-and-persistence-changed';

type V2ChangeKind =
  | 'direction-state-changed'
  | 'persistence-state-changed'
  | 'direction-and-persistence-changed';

export type MomentumCarrierTail = Readonly<{
  canonicalArtistId: string;
  carrierRecordId: string;
  alignmentCutoffAt: string;
  directionalConsensus: DirectionalConsensus;
  persistenceConsensus: PersistenceConsensus;
  sourceLineage:
    | Readonly<{
        kind: 'legacy-v143';
        sourceContractVersion: typeof LEGACY_SOURCE_CONTRACT;
        sourceDigest: string;
      }>
    | Readonly<{
        kind: 'categorical-attestation';
        sourceContractVersion:
          typeof FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION;
        sourceDigest: string;
      }>;
}>;

type DecisionSafety = Readonly<{
  productMomentumScore: null;
  numericProductEligible: false;
  previewFallbackAllowed: false;
  historyWritePerformed: false;
  databaseWrites: 0;
}>;

export type MomentumCarrierPersistenceDecision =
  | Readonly<{
      contractVersion:
        typeof FANDEX_MOMENTUM_CARRIER_PERSISTENCE_DECISION_VERSION;
      state: 'blocked';
      reason:
        | 'current-carrier-invalid'
        | 'attestation-invalid'
        | 'artist-identity-mismatch'
        | 'alignment-regression'
        | 'same-cutoff-state-change-revision-review-required'
        | 'classification-carrier-state-mismatch';
      appendRequired: false;
      safety: DecisionSafety;
    }>
  | Readonly<{
      contractVersion:
        typeof FANDEX_MOMENTUM_CARRIER_PERSISTENCE_DECISION_VERSION;
      state: 'attested-no-op';
      classification: NoOpClassification;
      appendRequired: false;
      currentCarrierRecordId: string;
      evaluatedAlignmentCutoffAt: string;
      directionalConsensus: DirectionalConsensus;
      persistenceConsensus: PersistenceConsensus;
      sourceAttestationContractVersion:
        typeof FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION;
      sourceAttestationDigest: string;
      safety: DecisionSafety;
    }>
  | Readonly<{
      contractVersion:
        typeof FANDEX_MOMENTUM_CARRIER_PERSISTENCE_DECISION_VERSION;
      state: 'append-v2-carrier-candidate';
      classification: AppendClassification;
      appendRequired: true;
      targetHistoryContractVersion:
        typeof FANDEX_MOMENTUM_CARRIER_HISTORY_V2;
      changeKind: V2ChangeKind;
      previousRecordDigest: string;
      previousSourceDigest: string;
      nextAlignmentCutoffAt: string;
      nextDirectionalConsensus: DirectionalConsensus;
      nextPersistenceConsensus: PersistenceConsensus;
      sourceAttestationContractVersion:
        typeof FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION;
      sourceAttestationDigest: string;
      safety: DecisionSafety;
    }>;

const SAFETY = Object.freeze({
  productMomentumScore: null,
  numericProductEligible: false as const,
  previewFallbackAllowed: false as const,
  historyWritePerformed: false as const,
  databaseWrites: 0 as const,
});

function validDigest(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function validIso(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function blocked(
  reason: Extract<
    MomentumCarrierPersistenceDecision,
    { state: 'blocked' }
  >['reason'],
): MomentumCarrierPersistenceDecision {
  return Object.freeze({
    contractVersion: FANDEX_MOMENTUM_CARRIER_PERSISTENCE_DECISION_VERSION,
    state: 'blocked' as const,
    reason,
    appendRequired: false as const,
    safety: SAFETY,
  });
}

function validCarrier(carrier: MomentumCarrierTail): boolean {
  return (
    carrier.canonicalArtistId.length > 0
    && validDigest(carrier.carrierRecordId)
    && validIso(carrier.alignmentCutoffAt)
    && validDigest(carrier.sourceLineage.sourceDigest)
    && (
      (
        carrier.sourceLineage.kind === 'legacy-v143'
        && carrier.sourceLineage.sourceContractVersion
          === LEGACY_SOURCE_CONTRACT
      )
      || (
        carrier.sourceLineage.kind === 'categorical-attestation'
        && carrier.sourceLineage.sourceContractVersion
          === FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION
      )
    )
  );
}

function validAttestation(
  attestation: FandexMomentumCategoricalOutputAttestation,
): boolean {
  const { attestationDigest, ...payload } = attestation;
  const classification =
    attestation.evaluationEvidence.evaluationClassification;

  return (
    attestation.contractVersion
      === FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION
    && attestation.lifecycle === 'research'
    && attestation.canonicalArtistId.length > 0
    && validDigest(attestationDigest)
    && sha256Canonical(payload) === attestationDigest
    && attestation.sourceLineage.kind
      === 'preview-independent-v142-current-evaluation'
    && attestation.sourceLineage.legacySourceV143Required === false
    && attestation.sourceLineage.legacySourceV143Digest === null
    && validDigest(attestation.sourceLineage.sourceV142Digest)
    && validIso(attestation.categoricalOutput.alignmentCutoffAt)
    && attestation.categoricalOutput.productMomentumScore === null
    && attestation.carrierLineageEligibility.eligible === true
    && attestation.carrierLineageEligibility.sourceDigestField
      === 'sourceAttestationDigest'
    && attestation.carrierLineageEligibility.sourceContractField
      === 'sourceAttestationContractVersion'
    && attestation.carrierLineageEligibility
      .existingSourceV143FieldMustNotBeReused === true
    && (
      classification === 'attested-no-op-same-cutoff-same-state'
      || classification === 'attested-no-op-cutoff-advanced-same-state'
      || classification === 'new-carrier-direction-state-changed'
      || classification === 'new-carrier-persistence-state-changed'
      || classification
        === 'new-carrier-direction-and-persistence-changed'
    )
  );
}

function expectedClassification(
  carrier: MomentumCarrierTail,
  attestation: FandexMomentumCategoricalOutputAttestation,
):
  | Readonly<{ kind: 'blocked'; reason: 'alignment-regression' }>
  | Readonly<{
      kind: 'blocked';
      reason: 'same-cutoff-state-change-revision-review-required';
    }>
  | Readonly<{ kind: 'no-op'; classification: NoOpClassification }>
  | Readonly<{
      kind: 'append';
      classification: AppendClassification;
      changeKind: V2ChangeKind;
    }> {
  const output = attestation.categoricalOutput;
  const currentCutoff = Date.parse(carrier.alignmentCutoffAt);
  const nextCutoff = Date.parse(output.alignmentCutoffAt);
  const directionChanged =
    output.directionalConsensus !== carrier.directionalConsensus;
  const persistenceChanged =
    output.persistenceConsensus !== carrier.persistenceConsensus;

  if (nextCutoff < currentCutoff) {
    return Object.freeze({
      kind: 'blocked' as const,
      reason: 'alignment-regression' as const,
    });
  }

  if (nextCutoff === currentCutoff) {
    if (directionChanged || persistenceChanged) {
      return Object.freeze({
        kind: 'blocked' as const,
        reason:
          'same-cutoff-state-change-revision-review-required' as const,
      });
    }

    return Object.freeze({
      kind: 'no-op' as const,
      classification: 'attested-no-op-same-cutoff-same-state' as const,
    });
  }

  if (!directionChanged && !persistenceChanged) {
    return Object.freeze({
      kind: 'no-op' as const,
      classification:
        'attested-no-op-cutoff-advanced-same-state' as const,
    });
  }

  if (directionChanged && persistenceChanged) {
    return Object.freeze({
      kind: 'append' as const,
      classification:
        'new-carrier-direction-and-persistence-changed' as const,
      changeKind: 'direction-and-persistence-changed' as const,
    });
  }

  if (directionChanged) {
    return Object.freeze({
      kind: 'append' as const,
      classification: 'new-carrier-direction-state-changed' as const,
      changeKind: 'direction-state-changed' as const,
    });
  }

  return Object.freeze({
    kind: 'append' as const,
    classification: 'new-carrier-persistence-state-changed' as const,
    changeKind: 'persistence-state-changed' as const,
  });
}

export function decideFandexMomentumCarrierPersistence(
  input: Readonly<{
    currentCarrier: MomentumCarrierTail;
    attestation: FandexMomentumCategoricalOutputAttestation;
  }>,
): MomentumCarrierPersistenceDecision {
  const { currentCarrier, attestation } = input;

  if (!validCarrier(currentCarrier)) {
    return blocked('current-carrier-invalid');
  }

  if (!validAttestation(attestation)) {
    return blocked('attestation-invalid');
  }

  if (currentCarrier.canonicalArtistId !== attestation.canonicalArtistId) {
    return blocked('artist-identity-mismatch');
  }

  const expected = expectedClassification(currentCarrier, attestation);

  if (expected.kind === 'blocked') {
    return blocked(expected.reason);
  }

  const actualClassification =
    attestation.evaluationEvidence.evaluationClassification;

  if (actualClassification !== expected.classification) {
    return blocked('classification-carrier-state-mismatch');
  }

  if (expected.kind === 'no-op') {
    return Object.freeze({
      contractVersion:
        FANDEX_MOMENTUM_CARRIER_PERSISTENCE_DECISION_VERSION,
      state: 'attested-no-op' as const,
      classification: expected.classification,
      appendRequired: false as const,
      currentCarrierRecordId: currentCarrier.carrierRecordId,
      evaluatedAlignmentCutoffAt:
        attestation.categoricalOutput.alignmentCutoffAt,
      directionalConsensus:
        attestation.categoricalOutput.directionalConsensus,
      persistenceConsensus:
        attestation.categoricalOutput.persistenceConsensus,
      sourceAttestationContractVersion:
        FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION,
      sourceAttestationDigest: attestation.attestationDigest,
      safety: SAFETY,
    });
  }

  return Object.freeze({
    contractVersion: FANDEX_MOMENTUM_CARRIER_PERSISTENCE_DECISION_VERSION,
    state: 'append-v2-carrier-candidate' as const,
    classification: expected.classification,
    appendRequired: true as const,
    targetHistoryContractVersion: FANDEX_MOMENTUM_CARRIER_HISTORY_V2,
    changeKind: expected.changeKind,
    previousRecordDigest: currentCarrier.carrierRecordId,
    previousSourceDigest: currentCarrier.sourceLineage.sourceDigest,
    nextAlignmentCutoffAt:
      attestation.categoricalOutput.alignmentCutoffAt,
    nextDirectionalConsensus:
      attestation.categoricalOutput.directionalConsensus,
    nextPersistenceConsensus:
      attestation.categoricalOutput.persistenceConsensus,
    sourceAttestationContractVersion:
      FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION,
    sourceAttestationDigest: attestation.attestationDigest,
    safety: SAFETY,
  });
}
