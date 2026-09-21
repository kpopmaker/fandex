import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateFandexMomentumProvenanceGatedRefreshResearch,
  FANDEX_MOMENTUM_PROVENANCE_GATED_REFRESH_RESEARCH_DESCRIPTOR,
} from '../lib/intelligence/fandexMomentumProvenanceGatedRefreshResearch';
import type {
  FandexMomentumOutputFormEligibilityResearchResult,
} from '../lib/intelligence/fandexMomentumOutputFormEligibilityResearch';
import {
  evaluateFandexMomentumSourceProvenanceResearch,
  type FandexMomentumSourceProvenanceResearchResult,
} from '../lib/intelligence/fandexMomentumSourceProvenanceResearch';

function categorical(): FandexMomentumOutputFormEligibilityResearchResult {
  return {
    contractVersion: 'v143_fandex_momentum_output_form_eligibility_research_v1',
    sourceContractVersion: 'v142_fandex_momentum_cross_family_combination_research_v1',
    state: 'categorical-research-output-only',
    canonicalArtistId: 'iu',
    alignmentCutoffAt: '2026-09-20T01:59:13.000Z',
    currentResearchOutput: {
      outputForm: 'structured-categorical-evidence',
      directionalConsensus: 'direction-conflicted',
      persistenceConsensus: 'persistence-not-applicable',
      qualitativeDirectionEvidenceUsable: false,
      levelPercentileSpreadDiagnostic: 100,
      productMomentumScore: null,
    },
    numericEligibility: {
      status: 'not-eligible',
      unmetRequirements: [],
      numericEstimand: null,
      calibrationTarget: null,
      mappingOrWeights: null,
      outOfSampleValidation: null,
      additionalFamiliesAloneSufficient: false,
      legacyPreviewSeedCalibrationAllowed: false,
    },
    currentProductSchema: {
      metricValueKind: 'number-or-null',
      weightedScoreRequiresNumericValue: true,
      currentMomentumSourceStage: 'derived_signal',
      currentMomentumQualityLabel: 'preview',
      previewFallbackEnabled: true,
      previewFallbackExample: null,
      categoricalEvidenceFitsCurrentMomentumSlot: false,
    },
    researchCarrier: {
      observationContractVersion: 'fandex-observation-v1',
      categoricalRawValueSupported: true,
      recommendedVariableId: 'momentum.cross-family-evidence-state.research',
      registryBindingEstablished: false,
      productMetricBindingEstablished: false,
    },
    blockers: [],
    digest: '8'.repeat(64),
    effects: {
      externalCalls: 0,
      databaseReads: 0,
      databaseWrites: 0,
      masterScoreWrites: 0,
      websiteWrites: 0,
    },
  };
}

function provenance(reproduced: boolean): FandexMomentumSourceProvenanceResearchResult {
  const state = reproduced
    ? 'stored-evidence-read-reproduced'
    : 'lineage-runtime-verified-stored-evidence-not-reproduced';
  return {
    contractVersion: 'v153_fandex_momentum_source_provenance_research_v1',
    state,
    canonicalArtistId: 'iu',
    naverThroughSlotStart: '2026-09-21T00:00:00.000Z',
    naverCollectionKey: 'sched-v125-naver-news-20260921t000000z-f1ed381d367d',
    naverEvidenceId: 'dae0750b1ad81f468f479328ef726e6344eaa31a62246cce3e4aeebc5d9a3f7d',
    deterministicLineageVerified: true,
    productionRuntimeInvocationObserved: true,
    runtimeObservationMapsToEvidenceSlot: true,
    snapshotEvidenceInternallyConsistent: true,
    storedEvidenceReproducedThisEvaluation: reproduced,
    provenanceStrength: reproduced
      ? 'stored-evidence-read-reproduced'
      : 'deterministic-lineage-plus-production-runtime-invocation',
    currentRealClaimScope: reproduced
      ? 'live-stored-evidence-reproduced'
      : 'source-snapshot-with-runtime-lineage',
    futureLiveRefreshEligible: reproduced,
    blockers: reproduced ? [] : ['stored-evidence-live-reproduction-unavailable'],
    digest: reproduced ? 'a'.repeat(64) : 'b'.repeat(64),
    effects: {
      productMetricReads: 0,
      productMetricWrites: 0,
      previewFallbackReads: 0,
      databaseWrites: 0,
    },
  };
}

const base = {
  manifestJsonl: '',
  historyJsonl: '',
  watermarkJsonl: '',
  result: categorical(),
  sourceEvidence: {
    lastfmEvidenceId: '723cf73abb93882779edc0621a12381ab80e464c',
    lastfmLatestComponentEndAt: '2026-09-20T01:59:13.000Z',
    naverEvidenceId: 'dae0750b1ad81f468f479328ef726e6344eaa31a62246cce3e4aeebc5d9a3f7d',
    naverThroughSlotStart: '2026-09-21T00:00:00.000Z',
  },
  evaluatedAt: '2026-09-21T00:06:00.000Z',
  recordedAt: '2026-09-21T00:06:00.000Z',
  manifestedAt: '2026-09-21T00:06:00.000Z',
} as const;

test('v158 requires live stored-evidence reproduction before v155', () => {
  assert.equal(
    FANDEX_MOMENTUM_PROVENANCE_GATED_REFRESH_RESEARCH_DESCRIPTOR
      .storedEvidenceReproductionRequired,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_PROVENANCE_GATED_REFRESH_RESEARCH_DESCRIPTOR
      .provenanceBlockedInvokesPreflight,
    false,
  );

  let calls = 0;
  const out = evaluateFandexMomentumProvenanceGatedRefreshResearch(
    { ...base, provenance: provenance(false) },
    {
      evaluatePreflight: (() => {
        calls += 1;
        throw new Error('must not run');
      }) as any,
    },
  );
  assert.equal(calls, 0);
  assert.equal(out.state, 'provenance-blocked');
  assert.equal(out.preflightInvoked, false);
  assert.equal(out.readyForPhysicalPersistence, false);
  assert.ok(out.blockers.includes('live-stored-evidence-provenance-required'));
});

test('v158 blocks provenance/source watermark mismatch before v155', () => {
  let calls = 0;
  const out = evaluateFandexMomentumProvenanceGatedRefreshResearch(
    {
      ...base,
      provenance: provenance(true),
      sourceEvidence: {
        ...base.sourceEvidence,
        naverEvidenceId: '0'.repeat(64),
      },
    },
    {
      evaluatePreflight: (() => {
        calls += 1;
        throw new Error('must not run');
      }) as any,
    },
  );
  assert.equal(calls, 0);
  assert.equal(out.state, 'provenance-blocked');
  assert.equal(out.sourceEvidenceMatched, false);
  assert.ok(out.blockers.includes('provenance-source-evidence-mismatch'));
});

test('v158 preserves zero Product, preview, DB and artifact physical effects on block', () => {
  const out = evaluateFandexMomentumProvenanceGatedRefreshResearch({
    ...base,
    provenance: provenance(false),
  });
  assert.deepEqual(out.effects, {
    productMetricReads: 0,
    productMetricWrites: 0,
    previewFallbackReads: 0,
    databaseWrites: 0,
    historyWrites: 0,
    watermarkWrites: 0,
    manifestWrites: 0,
  });
});


test('committed v158 current audit reproduces fail-closed provenance gate without invoking v155', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_provenance_gated_refresh_v158_20260921T003602Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);

  assert.equal(
    audit.contractVersion,
    'v158_fandex_momentum_current_provenance_gate_audit_v1',
  );
  assert.equal(
    audit.liveStoredEvidenceAccess.currentSourceStoredEvidenceReproducedThisEvaluation,
    false,
  );
  assert.equal(audit.liveStoredEvidenceAccess.connectedNeonProjectVisible, false);
  assert.equal(
    audit.liveStoredEvidenceAccess.priorStoredReadAuditTransferableToCurrentSource,
    false,
  );

  const currentProvenance = evaluateFandexMomentumSourceProvenanceResearch({
    snapshot: {
      canonicalArtistId: audit.canonicalArtistId,
      naverEvidenceId: audit.sourceSnapshot.naverEvidenceId,
      naverCollectionKey: audit.sourceSnapshot.naverCollectionKey,
      naverThroughSlotStart: audit.sourceSnapshot.naverThroughSlotStart,
      naverStatus: audit.sourceSnapshot.naverStatus,
      naverRawEvidenceCount: audit.sourceSnapshot.naverRawEvidenceCount,
      naverNormalizedRecordCount: audit.sourceSnapshot.naverNormalizedRecordCount,
      naverDuplicateRecordCount: audit.sourceSnapshot.naverDuplicateRecordCount,
      naverRejectedItemCount: audit.sourceSnapshot.naverRejectedItemCount,
    },
    runtimeObservation: {
      observedAt: audit.productionRuntimeObservation.observedAt,
      requestPath: audit.productionRuntimeObservation.requestPath,
      httpStatus: audit.productionRuntimeObservation.httpStatus,
      deploymentId: audit.productionRuntimeObservation.deploymentId,
      branch: audit.productionRuntimeObservation.branch,
    },
    storedEvidenceReproducedThisEvaluation: false,
  });

  assert.equal(currentProvenance.digest, audit.provenance.digest);
  assert.equal(currentProvenance.state, audit.provenance.state);
  assert.equal(currentProvenance.futureLiveRefreshEligible, false);
  assert.deepEqual(currentProvenance.blockers, audit.provenance.blockers);

  let preflightCalls = 0;
  const out = evaluateFandexMomentumProvenanceGatedRefreshResearch(
    {
      ...base,
      provenance: currentProvenance,
      evaluatedAt: audit.evaluatedAt,
      recordedAt: audit.evaluatedAt,
      manifestedAt: audit.evaluatedAt,
    },
    {
      evaluatePreflight: (() => {
        preflightCalls += 1;
        throw new Error('v155_must_not_run');
      }) as any,
    },
  );

  assert.equal(preflightCalls, 0);
  assert.equal(out.digest, audit.v158.digest);
  assert.equal(out.state, 'provenance-blocked');
  assert.equal(out.sourceEvidenceMatched, true);
  assert.equal(out.preflightInvoked, false);
  assert.equal(out.readyForPhysicalPersistence, false);
  assert.deepEqual(out.blockers, audit.v158.blockers);
  assert.deepEqual(out.effects, audit.v158.effects);
  assert.equal(
    audit.validation.priorRun35547522307AcceptedAsCurrentLiveEvidence,
    false,
  );
  assert.equal(audit.productBoundary.productMomentumScore, null);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});
