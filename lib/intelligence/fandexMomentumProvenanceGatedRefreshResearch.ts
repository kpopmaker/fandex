import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumSourceEvidenceWatermark,
} from './fandexMomentumCommonCutoffAdvancementGateResearch';
import {
  evaluateFandexMomentumManifestGuardedPreflightResearch,
  type FandexMomentumManifestGuardedPreflightResult,
} from './fandexMomentumManifestGuardedPreflightResearch';
import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from './fandexMomentumOutputFormEligibilityResearch';
import type {
  FandexMomentumSourceProvenanceResearchResult,
} from './fandexMomentumSourceProvenanceResearch';

export const FANDEX_MOMENTUM_PROVENANCE_GATED_REFRESH_RESEARCH_VERSION =
  'v158_fandex_momentum_provenance_gated_current_live_refresh_research_v1' as const;

export const FANDEX_MOMENTUM_PROVENANCE_GATED_REFRESH_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_PROVENANCE_GATED_REFRESH_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    provenanceContract:
      'v153_fandex_momentum_source_provenance_research_v1' as const,
    preflightContract:
      'v155_fandex_momentum_manifest_guarded_evaluation_preflight_research_v1' as const,
    storedEvidenceReproductionRequired: true as const,
    sourceEvidenceMustMatchProvenance: true as const,
    provenanceBlockedInvokesPreflight: false as const,
    physicalPersistencePerformed: false as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    databaseWriteAllowed: false as const,
    productionEligible: false as const,
  });

export type FandexMomentumProvenanceGatedRefreshState =
  | 'provenance-blocked'
  | 'preflight-blocked'
  | 'refresh-prepared';

export type FandexMomentumProvenanceGatedRefreshResult = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_PROVENANCE_GATED_REFRESH_RESEARCH_VERSION;
  state: FandexMomentumProvenanceGatedRefreshState;
  canonicalArtistId: string;
  provenanceDigest: string;
  provenanceState: FandexMomentumSourceProvenanceResearchResult['state'];
  sourceEvidenceMatched: boolean;
  preflightInvoked: boolean;
  preflight: FandexMomentumManifestGuardedPreflightResult | null;
  readyForPhysicalPersistence: boolean;
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

export type FandexMomentumProvenanceGatedRefreshDependencies = Readonly<{
  evaluatePreflight?: typeof evaluateFandexMomentumManifestGuardedPreflightResearch;
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

function resultPayload(input: Readonly<{
  state: FandexMomentumProvenanceGatedRefreshState;
  canonicalArtistId: string;
  provenanceDigest: string;
  provenanceState: FandexMomentumSourceProvenanceResearchResult['state'];
  sourceEvidenceMatched: boolean;
  preflightInvoked: boolean;
  preflightDigest: string | null;
  readyForPhysicalPersistence: boolean;
  blockers: readonly string[];
}>) {
  return {
    contractVersion:
      FANDEX_MOMENTUM_PROVENANCE_GATED_REFRESH_RESEARCH_VERSION,
    state: input.state,
    canonicalArtistId: input.canonicalArtistId,
    provenanceDigest: input.provenanceDigest,
    provenanceState: input.provenanceState,
    sourceEvidenceMatched: input.sourceEvidenceMatched,
    preflightInvoked: input.preflightInvoked,
    preflightDigest: input.preflightDigest,
    readyForPhysicalPersistence: input.readyForPhysicalPersistence,
    blockers: Object.freeze([...input.blockers]),
  };
}

export function evaluateFandexMomentumProvenanceGatedRefreshResearch(
  input: Readonly<{
    provenance: FandexMomentumSourceProvenanceResearchResult;
    manifestJsonl: string;
    historyJsonl: string;
    watermarkJsonl: string;
    result: FandexMomentumOutputFormEligibilityResearchResult;
    sourceEvidence: FandexMomentumSourceEvidenceWatermark;
    evaluatedAt: string;
    recordedAt: string;
    manifestedAt: string;
  }>,
  dependencies: FandexMomentumProvenanceGatedRefreshDependencies = {},
): FandexMomentumProvenanceGatedRefreshResult {
  const provenance = input.provenance;
  if (
    provenance.contractVersion
      !== 'v153_fandex_momentum_source_provenance_research_v1'
  ) {
    throw new Error('momentum_v158_provenance_contract_invalid');
  }
  if (provenance.canonicalArtistId !== input.result.canonicalArtistId) {
    throw new Error('momentum_v158_artist_mismatch');
  }

  const sourceEvidenceMatched =
    provenance.naverEvidenceId === input.sourceEvidence.naverEvidenceId
    && provenance.naverThroughSlotStart
      === input.sourceEvidence.naverThroughSlotStart;

  const provenanceEligible =
    provenance.state === 'stored-evidence-read-reproduced'
    && provenance.storedEvidenceReproducedThisEvaluation === true
    && provenance.futureLiveRefreshEligible === true
    && provenance.blockers.length === 0;

  if (!provenanceEligible || !sourceEvidenceMatched) {
    const blockers = Object.freeze([
      ...(!provenanceEligible
        ? ['live-stored-evidence-provenance-required']
        : []),
      ...(!sourceEvidenceMatched
        ? ['provenance-source-evidence-mismatch']
        : []),
    ]);
    const payload = resultPayload({
      state: 'provenance-blocked',
      canonicalArtistId: input.result.canonicalArtistId,
      provenanceDigest: provenance.digest,
      provenanceState: provenance.state,
      sourceEvidenceMatched,
      preflightInvoked: false,
      preflightDigest: null,
      readyForPhysicalPersistence: false,
      blockers,
    });
    return Object.freeze({
      ...payload,
      preflight: null,
      effects: zeroEffects(),
      digest: sha256Canonical(payload),
    });
  }

  const evaluatePreflight =
    dependencies.evaluatePreflight
    ?? evaluateFandexMomentumManifestGuardedPreflightResearch;
  const preflight = evaluatePreflight({
    manifestJsonl: input.manifestJsonl,
    historyJsonl: input.historyJsonl,
    watermarkJsonl: input.watermarkJsonl,
    result: input.result,
    sourceEvidence: input.sourceEvidence,
    evaluatedAt: input.evaluatedAt,
    recordedAt: input.recordedAt,
    manifestedAt: input.manifestedAt,
  });

  const state = preflight.state === 'evaluation-prepared'
    ? 'refresh-prepared' as const
    : 'preflight-blocked' as const;
  const blockers = preflight.state === 'evaluation-prepared'
    ? Object.freeze([] as string[])
    : Object.freeze([...preflight.blockers]);
  const readyForPhysicalPersistence =
    preflight.state === 'evaluation-prepared'
    && preflight.readyForPhysicalPersistence;

  const payload = resultPayload({
    state,
    canonicalArtistId: input.result.canonicalArtistId,
    provenanceDigest: provenance.digest,
    provenanceState: provenance.state,
    sourceEvidenceMatched,
    preflightInvoked: true,
    preflightDigest: preflight.digest,
    readyForPhysicalPersistence,
    blockers,
  });

  return Object.freeze({
    ...payload,
    preflight,
    effects: zeroEffects(),
    digest: sha256Canonical(payload),
  });
}
