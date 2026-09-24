import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumManifestGuardedPreflightPrepared,
} from './fandexMomentumManifestGuardedPreflightResearch';
import {
  evaluateFandexMomentumPairedArtifactAcceptanceResearch,
  parseFandexMomentumPairedArtifactManifestJsonl,
  serializeFandexMomentumPairedArtifactManifestRecord,
  type FandexMomentumPairedArtifactAcceptanceResult,
} from './fandexMomentumPairedArtifactManifestResearch';

export const FANDEX_MOMENTUM_TRIPLE_ARTIFACT_ACCEPTANCE_RESEARCH_VERSION =
  'v156_fandex_momentum_triple_artifact_post_persistence_acceptance_research_v1' as const;

export const FANDEX_MOMENTUM_TRIPLE_ARTIFACT_ACCEPTANCE_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_TRIPLE_ARTIFACT_ACCEPTANCE_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    upstreamPreflightContract:
      'v155_fandex_momentum_manifest_guarded_evaluation_preflight_research_v1' as const,
    pairedArtifactContract:
      'v154_fandex_momentum_paired_artifact_persistence_manifest_research_v1' as const,
    requiresPreparedPreflight: true as const,
    verifiesHistoryWatermarkAndManifestTogether: true as const,
    acceptsOnlyExactExpectedTriple: true as const,
    detectsPairAppliedManifestMissing: true as const,
    detectsManifestAheadOfRequiredPair: true as const,
    detectsUnexpectedArtifactBytes: true as const,
    physicalPersistencePerformed: false as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    databaseWriteAllowed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumTripleArtifactAcceptanceState =
  | 'accepted-resulting-triple'
  | 'writes-not-applied'
  | 'partial-history-only'
  | 'partial-watermark-only'
  | 'history-watermark-applied-manifest-missing'
  | 'manifest-applied-required-history-missing'
  | 'manifest-applied-required-watermark-missing'
  | 'manifest-applied-required-pair-missing'
  | 'manifest-write-not-applied'
  | 'unexpected-artifact-state';

export type FandexMomentumTripleArtifactAcceptanceResult = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_TRIPLE_ARTIFACT_ACCEPTANCE_RESEARCH_VERSION;
  state: FandexMomentumTripleArtifactAcceptanceState;
  preflightDigest: string;
  nextManifestDigest: string;
  pairAcceptance: FandexMomentumPairedArtifactAcceptanceResult;
  observedManifestDigest: string;
  priorManifestDigest: string;
  proposedManifestDigest: string;
  manifestAtPrior: boolean;
  manifestAtResult: boolean;
  exactExpectedTripleObserved: boolean;
  readyForNextEvaluation: boolean;
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

function artifactDigest(value: string): string {
  return sha256Canonical({ artifactJsonl: value });
}

function priorManifestJsonl(
  preflight: FandexMomentumManifestGuardedPreflightPrepared,
): string {
  const serializedNext =
    serializeFandexMomentumPairedArtifactManifestRecord(preflight.nextManifest);
  const suffix = serializedNext + '\n';
  if (!preflight.proposedManifestJsonl.endsWith(suffix)) {
    throw new Error('momentum_v156_proposed_manifest_suffix_invalid');
  }
  return preflight.proposedManifestJsonl.slice(0, -suffix.length);
}

function assertPreparedPreflight(
  preflight: FandexMomentumManifestGuardedPreflightPrepared,
): void {
  if (
    preflight.contractVersion
      !== 'v155_fandex_momentum_manifest_guarded_evaluation_preflight_research_v1'
    || preflight.state !== 'evaluation-prepared'
    || preflight.readyForPhysicalPersistence !== true
    || preflight.coordinatorInvoked !== true
  ) {
    throw new Error('momentum_v156_preflight_invalid');
  }
  if (
    preflight.proposedWrites.historyWrites
      !== preflight.nextManifest.expectedWrites.historyWrites
    || preflight.proposedWrites.watermarkWrites
      !== preflight.nextManifest.expectedWrites.watermarkWrites
    || preflight.proposedWrites.manifestWrites !== 1
  ) {
    throw new Error('momentum_v156_write_plan_mismatch');
  }
  const proposedManifest =
    parseFandexMomentumPairedArtifactManifestJsonl(
      preflight.proposedManifestJsonl,
    );
  if (
    proposedManifest.at(-1)?.manifestDigest
      !== preflight.nextManifest.manifestDigest
  ) {
    throw new Error('momentum_v156_proposed_manifest_invalid');
  }
}

export function evaluateFandexMomentumTripleArtifactAcceptanceResearch(
  input: Readonly<{
    preflight: FandexMomentumManifestGuardedPreflightPrepared;
    observedHistoryJsonl: string;
    observedWatermarkJsonl: string;
    observedManifestJsonl: string;
  }>,
): FandexMomentumTripleArtifactAcceptanceResult {
  const { preflight } = input;
  assertPreparedPreflight(preflight);

  const priorManifest = priorManifestJsonl(preflight);
  const priorManifestDigest = artifactDigest(priorManifest);
  const proposedManifestDigest = artifactDigest(
    preflight.proposedManifestJsonl,
  );
  const observedManifestDigest = artifactDigest(input.observedManifestJsonl);

  parseFandexMomentumPairedArtifactManifestJsonl(input.observedManifestJsonl);

  const manifestAtPrior = observedManifestDigest === priorManifestDigest;
  const manifestAtResult =
    observedManifestDigest === proposedManifestDigest;

  const pairAcceptance =
    evaluateFandexMomentumPairedArtifactAcceptanceResearch({
      manifest: preflight.nextManifest,
      observedHistoryJsonl: input.observedHistoryJsonl,
      observedWatermarkJsonl: input.observedWatermarkJsonl,
    });

  const historyRequired = preflight.proposedWrites.historyWrites === 1;
  const watermarkRequired = preflight.proposedWrites.watermarkWrites === 1;
  const historyAtResult = pairAcceptance.historyAtResult;
  const watermarkAtResult = pairAcceptance.watermarkAtResult;
  const historyAtPrior = pairAcceptance.historyAtPrior;
  const watermarkAtPrior = pairAcceptance.watermarkAtPrior;

  let state: FandexMomentumTripleArtifactAcceptanceState;
  let blockers: readonly string[];

  if (
    manifestAtResult
    && historyAtResult
    && watermarkAtResult
  ) {
    state = 'accepted-resulting-triple';
    blockers = Object.freeze([]);
  } else if (!manifestAtPrior && !manifestAtResult) {
    state = 'unexpected-artifact-state';
    blockers = Object.freeze(['triple-artifact-manifest-state-unexpected']);
  } else if (pairAcceptance.state === 'unexpected-artifact-state') {
    state = 'unexpected-artifact-state';
    blockers = Object.freeze(['triple-artifact-pair-state-unexpected']);
  } else if (manifestAtPrior) {
    if (
      historyRequired
      && watermarkRequired
      && historyAtResult
      && watermarkAtResult
    ) {
      state = 'history-watermark-applied-manifest-missing';
      blockers = Object.freeze(['triple-artifact-manifest-write-missing']);
    } else if (
      historyRequired
      && historyAtResult
      && watermarkAtPrior
    ) {
      state = 'partial-history-only';
      blockers = Object.freeze([
        'triple-artifact-watermark-write-missing',
        'triple-artifact-manifest-write-missing',
      ]);
    } else if (
      watermarkRequired
      && watermarkAtResult
      && historyAtPrior
    ) {
      state = 'partial-watermark-only';
      blockers = Object.freeze([
        'triple-artifact-history-write-missing',
        'triple-artifact-manifest-write-missing',
      ]);
    } else if (
      !historyRequired
      && !watermarkRequired
      && historyAtResult
      && watermarkAtResult
    ) {
      state = 'manifest-write-not-applied';
      blockers = Object.freeze(['triple-artifact-manifest-write-missing']);
    } else if (historyAtPrior && watermarkAtPrior) {
      state = 'writes-not-applied';
      blockers = Object.freeze(['triple-artifact-writes-not-applied']);
    } else {
      state = 'unexpected-artifact-state';
      blockers = Object.freeze(['triple-artifact-state-unexpected']);
    }
  } else if (manifestAtResult) {
    if (
      historyRequired
      && watermarkRequired
      && historyAtPrior
      && watermarkAtPrior
    ) {
      state = 'manifest-applied-required-pair-missing';
      blockers = Object.freeze([
        'triple-artifact-history-write-missing',
        'triple-artifact-watermark-write-missing',
      ]);
    } else if (
      historyRequired
      && historyAtPrior
      && watermarkAtResult
    ) {
      state = 'manifest-applied-required-history-missing';
      blockers = Object.freeze(['triple-artifact-history-write-missing']);
    } else if (
      watermarkRequired
      && watermarkAtPrior
      && historyAtResult
    ) {
      state = 'manifest-applied-required-watermark-missing';
      blockers = Object.freeze(['triple-artifact-watermark-write-missing']);
    } else {
      state = 'unexpected-artifact-state';
      blockers = Object.freeze(['triple-artifact-state-unexpected']);
    }
  } else {
    state = 'unexpected-artifact-state';
    blockers = Object.freeze(['triple-artifact-state-unexpected']);
  }

  const exactExpectedTripleObserved =
    state === 'accepted-resulting-triple';
  const readyForNextEvaluation = exactExpectedTripleObserved;

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_TRIPLE_ARTIFACT_ACCEPTANCE_RESEARCH_VERSION,
    state,
    preflightDigest: preflight.digest,
    nextManifestDigest: preflight.nextManifest.manifestDigest,
    pairAcceptanceDigest: pairAcceptance.digest,
    observedManifestDigest,
    priorManifestDigest,
    proposedManifestDigest,
    manifestAtPrior,
    manifestAtResult,
    exactExpectedTripleObserved,
    readyForNextEvaluation,
    blockers,
  };

  return Object.freeze({
    contractVersion: payload.contractVersion,
    state,
    preflightDigest: preflight.digest,
    nextManifestDigest: preflight.nextManifest.manifestDigest,
    pairAcceptance,
    observedManifestDigest,
    priorManifestDigest,
    proposedManifestDigest,
    manifestAtPrior,
    manifestAtResult,
    exactExpectedTripleObserved,
    readyForNextEvaluation,
    blockers,
    effects: Object.freeze({
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      databaseWrites: 0 as const,
      historyWrites: 0 as const,
      watermarkWrites: 0 as const,
      manifestWrites: 0 as const,
    }),
    digest: sha256Canonical(payload),
  });
}
