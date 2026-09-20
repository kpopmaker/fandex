import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumSourceEvidenceWatermark,
} from './fandexMomentumCommonCutoffAdvancementGateResearch';
import {
  coordinateFandexMomentumDualArtifactEvaluationResearch,
  type FandexMomentumDualArtifactCoordinatorResult,
} from './fandexMomentumDualArtifactCoordinatorResearch';
import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from './fandexMomentumOutputFormEligibilityResearch';
import {
  buildFandexMomentumPairedArtifactManifestResearch,
  evaluateFandexMomentumPairedArtifactAcceptanceResearch,
  parseFandexMomentumPairedArtifactManifestJsonl,
  serializeFandexMomentumPairedArtifactManifestRecord,
  type FandexMomentumPairedArtifactAcceptanceResult,
  type FandexMomentumPairedArtifactManifestRecord,
} from './fandexMomentumPairedArtifactManifestResearch';

export const FANDEX_MOMENTUM_MANIFEST_GUARDED_PREFLIGHT_RESEARCH_VERSION =
  'v155_fandex_momentum_manifest_guarded_evaluation_preflight_research_v1' as const;

export const FANDEX_MOMENTUM_MANIFEST_GUARDED_PREFLIGHT_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_MANIFEST_GUARDED_PREFLIGHT_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    coordinatorContract:
      'v152_fandex_momentum_dual_artifact_evaluation_coordinator_research_v1' as const,
    manifestContract:
      'v154_fandex_momentum_paired_artifact_persistence_manifest_research_v1' as const,
    currentPairAcceptanceRequiredBeforeCoordinator: true as const,
    blockedPreflightInvokesCoordinator: false as const,
    acceptedPreflightBuildsNextManifestIntent: true as const,
    returnsProposedTripleArtifactBoundary: true as const,
    physicalPersistencePerformed: false as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    databaseWriteAllowed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumManifestGuardedPreflightState =
  | 'preflight-blocked'
  | 'evaluation-prepared';

export type FandexMomentumManifestGuardedPreflightBlocker =
  | 'paired-artifact-manifest-missing'
  | string;

type ProposedWrites = Readonly<{
  historyWrites: 0 | 1;
  watermarkWrites: 0 | 1;
  manifestWrites: 1;
}>;

type ZeroEffects = Readonly<{
  productMetricReads: 0;
  productMetricWrites: 0;
  previewFallbackReads: 0;
  databaseWrites: 0;
  historyWrites: 0;
  watermarkWrites: 0;
  manifestWrites: 0;
}>;

export type FandexMomentumManifestGuardedPreflightBlocked = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_MANIFEST_GUARDED_PREFLIGHT_RESEARCH_VERSION;
  state: 'preflight-blocked';
  latestManifestDigest: string | null;
  currentPairAcceptance: FandexMomentumPairedArtifactAcceptanceResult | null;
  coordinatorInvoked: false;
  coordinator: null;
  nextManifest: null;
  proposedHistoryJsonl: null;
  proposedWatermarkJsonl: null;
  proposedManifestJsonl: null;
  proposedWrites: null;
  readyForPhysicalPersistence: false;
  blockers: readonly FandexMomentumManifestGuardedPreflightBlocker[];
  effects: ZeroEffects;
  digest: string;
}>;

export type FandexMomentumManifestGuardedPreflightPrepared = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_MANIFEST_GUARDED_PREFLIGHT_RESEARCH_VERSION;
  state: 'evaluation-prepared';
  latestManifestDigest: string;
  currentPairAcceptance: FandexMomentumPairedArtifactAcceptanceResult;
  coordinatorInvoked: true;
  coordinator: FandexMomentumDualArtifactCoordinatorResult;
  nextManifest: FandexMomentumPairedArtifactManifestRecord;
  proposedHistoryJsonl: string;
  proposedWatermarkJsonl: string;
  proposedManifestJsonl: string;
  proposedWrites: ProposedWrites;
  readyForPhysicalPersistence: true;
  blockers: readonly [];
  effects: ZeroEffects;
  digest: string;
}>;

export type FandexMomentumManifestGuardedPreflightResult =
  | FandexMomentumManifestGuardedPreflightBlocked
  | FandexMomentumManifestGuardedPreflightPrepared;

export type FandexMomentumManifestGuardedPreflightDependencies = Readonly<{
  coordinate?: typeof coordinateFandexMomentumDualArtifactEvaluationResearch;
}>;

function artifactDigest(value: string): string {
  return sha256Canonical({ artifactJsonl: value });
}

function zeroEffects(): ZeroEffects {
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

function appendManifestJsonl(
  manifestJsonl: string,
  record: FandexMomentumPairedArtifactManifestRecord,
): string {
  const prefix = manifestJsonl.trim().length === 0
    ? ''
    : manifestJsonl.replace(/\s*$/, '') + '\n';
  return prefix
    + serializeFandexMomentumPairedArtifactManifestRecord(record)
    + '\n';
}

function blockedResult(input: Readonly<{
  latestManifestDigest: string | null;
  currentPairAcceptance: FandexMomentumPairedArtifactAcceptanceResult | null;
  blockers: readonly FandexMomentumManifestGuardedPreflightBlocker[];
}>): FandexMomentumManifestGuardedPreflightBlocked {
  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_MANIFEST_GUARDED_PREFLIGHT_RESEARCH_VERSION,
    state: 'preflight-blocked' as const,
    latestManifestDigest: input.latestManifestDigest,
    currentPairAcceptanceDigest: input.currentPairAcceptance?.digest ?? null,
    coordinatorInvoked: false as const,
    readyForPhysicalPersistence: false as const,
    blockers: Object.freeze([...input.blockers]),
  };
  return Object.freeze({
    contractVersion: payload.contractVersion,
    state: payload.state,
    latestManifestDigest: input.latestManifestDigest,
    currentPairAcceptance: input.currentPairAcceptance,
    coordinatorInvoked: false as const,
    coordinator: null,
    nextManifest: null,
    proposedHistoryJsonl: null,
    proposedWatermarkJsonl: null,
    proposedManifestJsonl: null,
    proposedWrites: null,
    readyForPhysicalPersistence: false as const,
    blockers: payload.blockers,
    effects: zeroEffects(),
    digest: sha256Canonical(payload),
  });
}

export function evaluateFandexMomentumManifestGuardedPreflightResearch(
  input: Readonly<{
    manifestJsonl: string;
    historyJsonl: string;
    watermarkJsonl: string;
    result: FandexMomentumOutputFormEligibilityResearchResult;
    sourceEvidence: FandexMomentumSourceEvidenceWatermark;
    evaluatedAt: string;
    recordedAt: string;
    manifestedAt: string;
  }>,
  dependencies: FandexMomentumManifestGuardedPreflightDependencies = {},
): FandexMomentumManifestGuardedPreflightResult {
  const manifests =
    parseFandexMomentumPairedArtifactManifestJsonl(input.manifestJsonl);
  const latestManifest = manifests.at(-1) ?? null;

  if (!latestManifest) {
    return blockedResult({
      latestManifestDigest: null,
      currentPairAcceptance: null,
      blockers: Object.freeze(['paired-artifact-manifest-missing']),
    });
  }

  const currentPairAcceptance =
    evaluateFandexMomentumPairedArtifactAcceptanceResearch({
      manifest: latestManifest,
      observedHistoryJsonl: input.historyJsonl,
      observedWatermarkJsonl: input.watermarkJsonl,
    });

  if (!currentPairAcceptance.readyForNextEvaluation) {
    return blockedResult({
      latestManifestDigest: latestManifest.manifestDigest,
      currentPairAcceptance,
      blockers: currentPairAcceptance.blockers,
    });
  }

  const coordinate =
    dependencies.coordinate
    ?? coordinateFandexMomentumDualArtifactEvaluationResearch;
  const coordinator = coordinate({
    historyJsonl: input.historyJsonl,
    watermarkJsonl: input.watermarkJsonl,
    result: input.result,
    sourceEvidence: input.sourceEvidence,
    evaluatedAt: input.evaluatedAt,
    recordedAt: input.recordedAt,
  });

  const nextManifest = buildFandexMomentumPairedArtifactManifestResearch({
    coordinator,
    sequence: latestManifest.sequence + 1,
    manifestedAt: input.manifestedAt,
    previousManifest: latestManifest,
  });
  const proposedManifestJsonl =
    appendManifestJsonl(input.manifestJsonl, nextManifest);

  const reparsed =
    parseFandexMomentumPairedArtifactManifestJsonl(proposedManifestJsonl);
  if (
    reparsed.length !== manifests.length + 1
    || reparsed.at(-1)?.manifestDigest !== nextManifest.manifestDigest
  ) {
    throw new Error('momentum_v155_manifest_append_postcondition_failed');
  }

  const proposedWrites = Object.freeze({
    historyWrites: coordinator.effects.historyWrites,
    watermarkWrites: coordinator.effects.watermarkWrites,
    manifestWrites: 1 as const,
  });
  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_MANIFEST_GUARDED_PREFLIGHT_RESEARCH_VERSION,
    state: 'evaluation-prepared' as const,
    latestManifestDigest: latestManifest.manifestDigest,
    currentPairAcceptanceDigest: currentPairAcceptance.digest,
    coordinatorInvoked: true as const,
    coordinatorDigest: coordinator.digest,
    coordinatorState: coordinator.state,
    nextManifestDigest: nextManifest.manifestDigest,
    proposedHistoryDigest: artifactDigest(coordinator.historyJsonl),
    proposedWatermarkDigest: artifactDigest(coordinator.watermarkJsonl),
    proposedManifestDigest: artifactDigest(proposedManifestJsonl),
    proposedWrites,
    readyForPhysicalPersistence: true as const,
    blockers: Object.freeze([] as string[]),
  };

  return Object.freeze({
    contractVersion: payload.contractVersion,
    state: payload.state,
    latestManifestDigest: latestManifest.manifestDigest,
    currentPairAcceptance,
    coordinatorInvoked: true as const,
    coordinator,
    nextManifest,
    proposedHistoryJsonl: coordinator.historyJsonl,
    proposedWatermarkJsonl: coordinator.watermarkJsonl,
    proposedManifestJsonl,
    proposedWrites,
    readyForPhysicalPersistence: true as const,
    blockers: Object.freeze([] as const),
    effects: zeroEffects(),
    digest: sha256Canonical(payload),
  });
}
