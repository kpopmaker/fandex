import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumManifestGuardedPreflightPrepared,
} from './fandexMomentumManifestGuardedPreflightResearch';
import type {
  FandexMomentumTripleArtifactAcceptanceResult,
  FandexMomentumTripleArtifactAcceptanceState,
} from './fandexMomentumTripleArtifactAcceptanceResearch';

export const FANDEX_MOMENTUM_PARTIAL_PERSISTENCE_RECOVERY_RESEARCH_VERSION =
  'v157_fandex_momentum_partial_persistence_recovery_planning_research_v1' as const;

export const FANDEX_MOMENTUM_PARTIAL_PERSISTENCE_RECOVERY_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_PARTIAL_PERSISTENCE_RECOVERY_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    upstreamPreflightContract:
      'v155_fandex_momentum_manifest_guarded_evaluation_preflight_research_v1' as const,
    upstreamAcceptanceContract:
      'v156_fandex_momentum_triple_artifact_post_persistence_acceptance_research_v1' as const,
    rewritesAlreadyCorrectArtifact: false as const,
    manifestAheadAutoRepairAllowed: false as const,
    unexpectedStateAutoRepairAllowed: false as const,
    physicalPersistencePerformed: false as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    databaseWriteAllowed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumRecoveryPlanState =
  | 'no-recovery-needed'
  | 'recovery-plan-prepared'
  | 'recovery-blocked';

export type FandexMomentumRecoveryWritePlan = Readonly<{
  historyWrites: 0 | 1;
  watermarkWrites: 0 | 1;
  manifestWrites: 0 | 1;
}>;

export type FandexMomentumPartialPersistenceRecoveryResult = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_PARTIAL_PERSISTENCE_RECOVERY_RESEARCH_VERSION;
  state: FandexMomentumRecoveryPlanState;
  acceptanceState: FandexMomentumTripleArtifactAcceptanceState;
  preflightDigest: string;
  acceptanceDigest: string;
  nextManifestDigest: string;
  proposedWrites: FandexMomentumRecoveryWritePlan;
  historyWriteJsonl: string | null;
  watermarkWriteJsonl: string | null;
  manifestWriteJsonl: string | null;
  readyForNextEvaluation: boolean;
  safeRecoveryPlanAvailable: boolean;
  blockers: readonly string[];
  effects: Readonly<{
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    databaseWrites: 0;
    historyWrites: 0;
    watermarkWrites: 0;
    manifestWrites: 0;
  }>;
  digest: string;
}>;

function zeroEffects() {
  return Object.freeze({
    productMetricReads: 0 as const,
    productMetricWrites: 0 as const,
    previewFallbackReads: 0 as const,
    databaseWrites: 0 as const,
    historyWrites: 0 as const,
    watermarkWrites: 0 as const,
    manifestWrites: 0 as const,
  });
}

function assertCompatible(
  preflight: FandexMomentumManifestGuardedPreflightPrepared,
  acceptance: FandexMomentumTripleArtifactAcceptanceResult,
): void {
  if (
    preflight.contractVersion
      !== 'v155_fandex_momentum_manifest_guarded_evaluation_preflight_research_v1'
    || preflight.state !== 'evaluation-prepared'
  ) {
    throw new Error('momentum_v157_preflight_invalid');
  }
  if (
    acceptance.contractVersion
      !== 'v156_fandex_momentum_triple_artifact_post_persistence_acceptance_research_v1'
  ) {
    throw new Error('momentum_v157_acceptance_invalid');
  }
  if (acceptance.preflightDigest !== preflight.digest) {
    throw new Error('momentum_v157_preflight_digest_mismatch');
  }
  if (
    acceptance.nextManifestDigest
      !== preflight.nextManifest.manifestDigest
  ) {
    throw new Error('momentum_v157_manifest_digest_mismatch');
  }
}

function prepared(
  input: Readonly<{
    preflight: FandexMomentumManifestGuardedPreflightPrepared;
    acceptance: FandexMomentumTripleArtifactAcceptanceResult;
    historyWrites: 0 | 1;
    watermarkWrites: 0 | 1;
    manifestWrites: 0 | 1;
  }>,
): FandexMomentumPartialPersistenceRecoveryResult {
  const proposedWrites = Object.freeze({
    historyWrites: input.historyWrites,
    watermarkWrites: input.watermarkWrites,
    manifestWrites: input.manifestWrites,
  });
  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_PARTIAL_PERSISTENCE_RECOVERY_RESEARCH_VERSION,
    state: 'recovery-plan-prepared' as const,
    acceptanceState: input.acceptance.state,
    preflightDigest: input.preflight.digest,
    acceptanceDigest: input.acceptance.digest,
    nextManifestDigest: input.preflight.nextManifest.manifestDigest,
    proposedWrites,
    readyForNextEvaluation: false as const,
    safeRecoveryPlanAvailable: true as const,
    blockers: Object.freeze([] as string[]),
  };

  return Object.freeze({
    ...payload,
    historyWriteJsonl:
      input.historyWrites === 1
        ? input.preflight.proposedHistoryJsonl
        : null,
    watermarkWriteJsonl:
      input.watermarkWrites === 1
        ? input.preflight.proposedWatermarkJsonl
        : null,
    manifestWriteJsonl:
      input.manifestWrites === 1
        ? input.preflight.proposedManifestJsonl
        : null,
    effects: zeroEffects(),
    digest: sha256Canonical(payload),
  });
}

function blocked(
  input: Readonly<{
    preflight: FandexMomentumManifestGuardedPreflightPrepared;
    acceptance: FandexMomentumTripleArtifactAcceptanceResult;
    blockers: readonly string[];
  }>,
): FandexMomentumPartialPersistenceRecoveryResult {
  const proposedWrites = Object.freeze({
    historyWrites: 0 as const,
    watermarkWrites: 0 as const,
    manifestWrites: 0 as const,
  });
  const blockers = Object.freeze([...input.blockers]);
  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_PARTIAL_PERSISTENCE_RECOVERY_RESEARCH_VERSION,
    state: 'recovery-blocked' as const,
    acceptanceState: input.acceptance.state,
    preflightDigest: input.preflight.digest,
    acceptanceDigest: input.acceptance.digest,
    nextManifestDigest: input.preflight.nextManifest.manifestDigest,
    proposedWrites,
    readyForNextEvaluation: false as const,
    safeRecoveryPlanAvailable: false as const,
    blockers,
  };

  return Object.freeze({
    ...payload,
    historyWriteJsonl: null,
    watermarkWriteJsonl: null,
    manifestWriteJsonl: null,
    effects: zeroEffects(),
    digest: sha256Canonical(payload),
  });
}

export function planFandexMomentumPartialPersistenceRecoveryResearch(
  input: Readonly<{
    preflight: FandexMomentumManifestGuardedPreflightPrepared;
    acceptance: FandexMomentumTripleArtifactAcceptanceResult;
  }>,
): FandexMomentumPartialPersistenceRecoveryResult {
  const { preflight, acceptance } = input;
  assertCompatible(preflight, acceptance);

  switch (acceptance.state) {
    case 'accepted-resulting-triple': {
      const proposedWrites = Object.freeze({
        historyWrites: 0 as const,
        watermarkWrites: 0 as const,
        manifestWrites: 0 as const,
      });
      const payload = {
        contractVersion:
          FANDEX_MOMENTUM_PARTIAL_PERSISTENCE_RECOVERY_RESEARCH_VERSION,
        state: 'no-recovery-needed' as const,
        acceptanceState: acceptance.state,
        preflightDigest: preflight.digest,
        acceptanceDigest: acceptance.digest,
        nextManifestDigest: preflight.nextManifest.manifestDigest,
        proposedWrites,
        readyForNextEvaluation: true as const,
        safeRecoveryPlanAvailable: false as const,
        blockers: Object.freeze([] as string[]),
      };
      return Object.freeze({
        ...payload,
        historyWriteJsonl: null,
        watermarkWriteJsonl: null,
        manifestWriteJsonl: null,
        effects: zeroEffects(),
        digest: sha256Canonical(payload),
      });
    }

    case 'writes-not-applied':
      return prepared({
        preflight,
        acceptance,
        historyWrites: preflight.proposedWrites.historyWrites,
        watermarkWrites: preflight.proposedWrites.watermarkWrites,
        manifestWrites: preflight.proposedWrites.manifestWrites,
      });

    case 'partial-history-only':
      return prepared({
        preflight,
        acceptance,
        historyWrites: 0,
        watermarkWrites: 1,
        manifestWrites: 1,
      });

    case 'partial-watermark-only':
      return prepared({
        preflight,
        acceptance,
        historyWrites: 1,
        watermarkWrites: 0,
        manifestWrites: 1,
      });

    case 'history-watermark-applied-manifest-missing':
    case 'manifest-write-not-applied':
      return prepared({
        preflight,
        acceptance,
        historyWrites: 0,
        watermarkWrites: 0,
        manifestWrites: 1,
      });

    case 'manifest-applied-required-history-missing':
    case 'manifest-applied-required-watermark-missing':
    case 'manifest-applied-required-pair-missing':
      return blocked({
        preflight,
        acceptance,
        blockers: Object.freeze([
          'manifest-ahead-auto-repair-forbidden',
          ...acceptance.blockers,
        ]),
      });

    case 'unexpected-artifact-state':
      return blocked({
        preflight,
        acceptance,
        blockers: Object.freeze([
          'unexpected-artifact-state-auto-repair-forbidden',
          ...acceptance.blockers,
        ]),
      });

    default: {
      const exhaustive: never = acceptance.state;
      throw new Error(
        `momentum_v157_unhandled_acceptance_state_${String(exhaustive)}`,
      );
    }
  }
}
