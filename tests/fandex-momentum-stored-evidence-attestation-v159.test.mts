import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateFandexMomentumStoredEvidenceAttestationResearch,
  evaluateFandexMomentumAttestedRefreshResearch,
  FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_DESCRIPTOR,
  FANDEX_MOMENTUM_ATTESTED_REFRESH_RESEARCH_DESCRIPTOR,
  type FandexMomentumStoredEvidenceReadAttestation,
} from '../lib/intelligence/fandexMomentumStoredEvidenceAttestationResearch';

const currentSnapshot = {
  canonicalArtistId: 'iu',
  naverEvidenceId:
    'dae0750b1ad81f468f479328ef726e6344eaa31a62246cce3e4aeebc5d9a3f7d',
  naverCollectionKey:
    'sched-v125-naver-news-20260921t000000z-f1ed381d367d',
  naverThroughSlotStart: '2026-09-21T00:00:00.000Z',
  naverStatus: 'succeeded' as const,
  naverRawEvidenceCount: 100,
  naverNormalizedRecordCount: 100,
  naverDuplicateRecordCount: 0,
  naverRejectedItemCount: 0,
};

const currentRuntime = {
  observedAt: '2026-09-21T00:02:01.000Z',
  requestPath: '/api/internal/naver-news/shadow-scheduler' as const,
  httpStatus: 200 as const,
  deploymentId: 'dpl_6fmT3qKqeytud3kFCNVoArBGGK1K',
  branch: 'main' as const,
};

test('v159 removes the caller-supplied reproduced boolean from the official provenance builder', () => {
  assert.equal(
    FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_DESCRIPTOR
      .callerSuppliedReproducedBooleanAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_DESCRIPTOR
      .derivesStoredEvidenceReproducedInternally,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_DESCRIPTOR
      .materializedPayloadFingerprintsRequired,
    true,
  );
  assert.equal(
    FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_DESCRIPTOR
      .databaseWriteAllowed,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_STORED_EVIDENCE_ATTESTATION_RESEARCH_DESCRIPTOR
      .productionEligible,
    false,
  );
});

test('prior 15:00Z live read audit becomes an accepted v159 attestation and reproduces v153 exactly', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_source_provenance_v153_live_reproduction_20260921T001447Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);

  const attestation: FandexMomentumStoredEvidenceReadAttestation = {
    contractVersion:
      'v159_fandex_momentum_stored_evidence_read_attestation_payload_v1',
    accessMode: audit.liveStoredEvidenceRead.accessMode,
    canonicalArtistId: audit.canonicalArtistId,
    naverEvidenceId: audit.sourceSnapshot.naverEvidenceId,
    naverThroughSlotStart: audit.sourceSnapshot.naverThroughSlotStart,
    readAt: audit.reproducedAt,
    jobRowReproduced: true,
    evidenceRows: audit.liveStoredEvidenceRead.evidenceRows,
    distinctEvidenceIds: audit.liveStoredEvidenceRead.distinctEvidenceIds,
    distinctItemIndexes: audit.liveStoredEvidenceRead.distinctItemIndexes,
    minItemIndex: audit.liveStoredEvidenceRead.minItemIndex,
    maxItemIndex: audit.liveStoredEvidenceRead.maxItemIndex,
    normalizedOutcomes: audit.liveStoredEvidenceRead.normalizedOutcomes,
    missingNormalizedIds: audit.liveStoredEvidenceRead.missingNormalizedIds,
    missingNormalizedRecords:
      audit.liveStoredEvidenceRead.missingNormalizedRecords,
    distinctNormalizedRecords:
      audit.liveStoredEvidenceRead.distinctNormalizedRecords,
    joinedPayloadRows: audit.liveStoredEvidenceRead.joinedPayloadRows,
    rawLinkageSetAuditMd5:
      audit.liveStoredEvidenceRead.rawLinkageSetAuditMd5,
    normalizedSetAuditMd5:
      audit.liveStoredEvidenceRead.normalizedSetAuditMd5,
    rawPayloadMaterializedAuditMd5:
      audit.liveStoredEvidenceRead.rawPayloadMaterializedAuditMd5,
    normalizedPayloadMaterializedAuditMd5:
      audit.liveStoredEvidenceRead.normalizedPayloadMaterializedAuditMd5,
    auditFingerprintPurpose:
      audit.liveStoredEvidenceRead.auditFingerprintPurpose,
  };

  const out = evaluateFandexMomentumStoredEvidenceAttestationResearch({
    snapshot: {
      canonicalArtistId: audit.canonicalArtistId,
      naverEvidenceId: audit.sourceSnapshot.naverEvidenceId,
      naverCollectionKey: audit.sourceSnapshot.naverCollectionKey,
      naverThroughSlotStart: audit.sourceSnapshot.naverThroughSlotStart,
      naverStatus: audit.sourceSnapshot.naverStatus,
      naverRawEvidenceCount: audit.sourceSnapshot.naverRawEvidenceCount,
      naverNormalizedRecordCount:
        audit.sourceSnapshot.naverNormalizedRecordCount,
      naverDuplicateRecordCount:
        audit.sourceSnapshot.naverDuplicateRecordCount,
      naverRejectedItemCount: audit.sourceSnapshot.naverRejectedItemCount,
    },
    runtimeObservation: {
      observedAt: audit.productionRuntimeObservation.observedAt,
      requestPath: audit.productionRuntimeObservation.requestPath,
      httpStatus: audit.productionRuntimeObservation.httpStatus,
      deploymentId: audit.productionRuntimeObservation.deploymentId,
      branch: audit.productionRuntimeObservation.branch,
    },
    readAttestation: attestation,
  });

  assert.equal(out.state, 'attested-provenance-ready');
  assert.equal(out.readAttestationPresent, true);
  assert.equal(out.readAttestationAccepted, true);
  assert.equal(out.storedEvidenceReproducedThisEvaluation, true);
  assert.equal(out.provenance.state, 'stored-evidence-read-reproduced');
  assert.equal(out.provenance.digest, audit.result.digest);
  assert.equal(out.provenance.futureLiveRefreshEligible, true);
  assert.deepEqual(out.blockers, []);
  assert.deepEqual(out.effects, {
    productMetricReads: 0,
    productMetricWrites: 0,
    previewFallbackReads: 0,
    databaseWrites: 0,
  });
});

test('current 00:00Z source without a read attestation stays blocked and cannot synthesize reproduced=true', () => {
  const out = evaluateFandexMomentumStoredEvidenceAttestationResearch({
    snapshot: currentSnapshot,
    runtimeObservation: currentRuntime,
    readAttestation: null,
  });

  assert.equal(out.state, 'attestation-blocked');
  assert.equal(out.readAttestationPresent, false);
  assert.equal(out.readAttestationAccepted, false);
  assert.equal(out.storedEvidenceReproducedThisEvaluation, false);
  assert.equal(
    out.provenance.state,
    'lineage-runtime-verified-stored-evidence-not-reproduced',
  );
  assert.equal(
    out.provenance.digest,
    '42a089fa8ba9bf61cdcc00b6f1aa376577c3fd15ca8609285fad21d76602810f',
  );
  assert.equal(out.provenance.futureLiveRefreshEligible, false);
  assert.ok(out.blockers.includes('stored-evidence-read-attestation-unavailable'));
  assert.ok(
    out.blockers.includes('stored-evidence-live-reproduction-unavailable'),
  );
});

test('mismatched source boundary cannot be upgraded by a structurally complete attestation', () => {
  const attestation: FandexMomentumStoredEvidenceReadAttestation = {
    contractVersion:
      'v159_fandex_momentum_stored_evidence_read_attestation_payload_v1',
    accessMode: 'preview-read-only-verifier',
    canonicalArtistId: 'iu',
    naverEvidenceId: '0'.repeat(64),
    naverThroughSlotStart: '2026-09-21T00:00:00.000Z',
    readAt: '2026-09-21T01:00:00.000Z',
    jobRowReproduced: true,
    evidenceRows: 100,
    distinctEvidenceIds: 100,
    distinctItemIndexes: 100,
    minItemIndex: 0,
    maxItemIndex: 99,
    normalizedOutcomes: 100,
    missingNormalizedIds: 0,
    missingNormalizedRecords: 0,
    distinctNormalizedRecords: 100,
    joinedPayloadRows: 100,
    rawLinkageSetAuditMd5: '1'.repeat(32),
    normalizedSetAuditMd5: '2'.repeat(32),
    rawPayloadMaterializedAuditMd5: '3'.repeat(32),
    normalizedPayloadMaterializedAuditMd5: '4'.repeat(32),
    auditFingerprintPurpose: 'read-integrity-only-not-methodology',
  };

  const out = evaluateFandexMomentumStoredEvidenceAttestationResearch({
    snapshot: currentSnapshot,
    runtimeObservation: currentRuntime,
    readAttestation: attestation,
  });

  assert.equal(out.state, 'attestation-blocked');
  assert.equal(out.readAttestationAccepted, false);
  assert.equal(out.storedEvidenceReproducedThisEvaluation, false);
  assert.equal(out.provenance.futureLiveRefreshEligible, false);
  assert.ok(
    out.blockers.includes('stored-evidence-attestation-source-boundary-mismatch'),
  );
});

test('incomplete row coverage or invalid fingerprints fail closed', () => {
  const attestation: FandexMomentumStoredEvidenceReadAttestation = {
    contractVersion:
      'v159_fandex_momentum_stored_evidence_read_attestation_payload_v1',
    accessMode: 'guarded-runtime-read-only',
    canonicalArtistId: 'iu',
    naverEvidenceId: currentSnapshot.naverEvidenceId,
    naverThroughSlotStart: currentSnapshot.naverThroughSlotStart,
    readAt: '2026-09-21T01:00:00.000Z',
    jobRowReproduced: true,
    evidenceRows: 99,
    distinctEvidenceIds: 99,
    distinctItemIndexes: 99,
    minItemIndex: 0,
    maxItemIndex: 98,
    normalizedOutcomes: 99,
    missingNormalizedIds: 1,
    missingNormalizedRecords: 1,
    distinctNormalizedRecords: 99,
    joinedPayloadRows: 99,
    rawLinkageSetAuditMd5: 'not-a-fingerprint',
    normalizedSetAuditMd5: '2'.repeat(32),
    rawPayloadMaterializedAuditMd5: '3'.repeat(32),
    normalizedPayloadMaterializedAuditMd5: '4'.repeat(32),
    auditFingerprintPurpose: 'read-integrity-only-not-methodology',
  };

  const out = evaluateFandexMomentumStoredEvidenceAttestationResearch({
    snapshot: currentSnapshot,
    runtimeObservation: currentRuntime,
    readAttestation: attestation,
  });

  assert.equal(out.state, 'attestation-blocked');
  assert.equal(out.storedEvidenceReproducedThisEvaluation, false);
  assert.ok(
    out.blockers.includes('stored-evidence-attestation-row-coverage-mismatch'),
  );
  assert.ok(
    out.blockers.includes(
      'stored-evidence-attestation-normalized-coverage-mismatch',
    ),
  );
  assert.ok(
    out.blockers.includes('stored-evidence-attestation-fingerprint-invalid'),
  );
});


test('v159 official refresh entrypoint never invokes v158 when current attestation is absent', () => {
  assert.equal(
    FANDEX_MOMENTUM_ATTESTED_REFRESH_RESEARCH_DESCRIPTOR
      .directV153BooleanInputAccepted,
    false,
  );
  assert.equal(
    FANDEX_MOMENTUM_ATTESTED_REFRESH_RESEARCH_DESCRIPTOR
      .blockedAttestationInvokesRefresh,
    false,
  );

  let refreshCalls = 0;
  const out = evaluateFandexMomentumAttestedRefreshResearch(
    {
      snapshot: currentSnapshot,
      runtimeObservation: currentRuntime,
      readAttestation: null,
      manifestJsonl: '',
      historyJsonl: '',
      watermarkJsonl: '',
      result: {
        contractVersion: 'v143_fandex_momentum_output_form_eligibility_research_v1',
        sourceContractVersion:
          'v142_fandex_momentum_cross_family_combination_research_v1',
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
          recommendedVariableId:
            'momentum.cross-family-evidence-state.research',
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
      },
      sourceEvidence: {
        lastfmEvidenceId:
          '723cf73abb93882779edc0621a12381ab80e464c',
        lastfmLatestComponentEndAt: '2026-09-20T01:59:13.000Z',
        naverEvidenceId: currentSnapshot.naverEvidenceId,
        naverThroughSlotStart: currentSnapshot.naverThroughSlotStart,
      },
      evaluatedAt: '2026-09-21T01:30:00.000Z',
      recordedAt: '2026-09-21T01:30:00.000Z',
      manifestedAt: '2026-09-21T01:30:00.000Z',
    },
    {
      evaluateRefresh: (() => {
        refreshCalls += 1;
        throw new Error('v158_must_not_run_without_attestation');
      }) as any,
    },
  );

  assert.equal(refreshCalls, 0);
  assert.equal(out.state, 'attestation-blocked');
  assert.equal(out.refreshInvoked, false);
  assert.equal(out.refresh, null);
  assert.equal(out.readyForPhysicalPersistence, false);
  assert.ok(out.blockers.includes('stored-evidence-read-attestation-unavailable'));
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

test('v159 official refresh entrypoint passes only attestation-derived v153 provenance into v158', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_source_provenance_v153_live_reproduction_20260921T001447Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);
  const readAttestation: FandexMomentumStoredEvidenceReadAttestation = {
    contractVersion:
      'v159_fandex_momentum_stored_evidence_read_attestation_payload_v1',
    accessMode: audit.liveStoredEvidenceRead.accessMode,
    canonicalArtistId: audit.canonicalArtistId,
    naverEvidenceId: audit.sourceSnapshot.naverEvidenceId,
    naverThroughSlotStart: audit.sourceSnapshot.naverThroughSlotStart,
    readAt: audit.reproducedAt,
    jobRowReproduced: true,
    evidenceRows: audit.liveStoredEvidenceRead.evidenceRows,
    distinctEvidenceIds: audit.liveStoredEvidenceRead.distinctEvidenceIds,
    distinctItemIndexes: audit.liveStoredEvidenceRead.distinctItemIndexes,
    minItemIndex: audit.liveStoredEvidenceRead.minItemIndex,
    maxItemIndex: audit.liveStoredEvidenceRead.maxItemIndex,
    normalizedOutcomes: audit.liveStoredEvidenceRead.normalizedOutcomes,
    missingNormalizedIds: audit.liveStoredEvidenceRead.missingNormalizedIds,
    missingNormalizedRecords:
      audit.liveStoredEvidenceRead.missingNormalizedRecords,
    distinctNormalizedRecords:
      audit.liveStoredEvidenceRead.distinctNormalizedRecords,
    joinedPayloadRows: audit.liveStoredEvidenceRead.joinedPayloadRows,
    rawLinkageSetAuditMd5:
      audit.liveStoredEvidenceRead.rawLinkageSetAuditMd5,
    normalizedSetAuditMd5:
      audit.liveStoredEvidenceRead.normalizedSetAuditMd5,
    rawPayloadMaterializedAuditMd5:
      audit.liveStoredEvidenceRead.rawPayloadMaterializedAuditMd5,
    normalizedPayloadMaterializedAuditMd5:
      audit.liveStoredEvidenceRead.normalizedPayloadMaterializedAuditMd5,
    auditFingerprintPurpose:
      audit.liveStoredEvidenceRead.auditFingerprintPurpose,
  };

  let refreshCalls = 0;
  const out = evaluateFandexMomentumAttestedRefreshResearch(
    {
      snapshot: {
        canonicalArtistId: audit.canonicalArtistId,
        naverEvidenceId: audit.sourceSnapshot.naverEvidenceId,
        naverCollectionKey: audit.sourceSnapshot.naverCollectionKey,
        naverThroughSlotStart: audit.sourceSnapshot.naverThroughSlotStart,
        naverStatus: audit.sourceSnapshot.naverStatus,
        naverRawEvidenceCount: audit.sourceSnapshot.naverRawEvidenceCount,
        naverNormalizedRecordCount:
          audit.sourceSnapshot.naverNormalizedRecordCount,
        naverDuplicateRecordCount:
          audit.sourceSnapshot.naverDuplicateRecordCount,
        naverRejectedItemCount:
          audit.sourceSnapshot.naverRejectedItemCount,
      },
      runtimeObservation: {
        observedAt: audit.productionRuntimeObservation.observedAt,
        requestPath: audit.productionRuntimeObservation.requestPath,
        httpStatus: audit.productionRuntimeObservation.httpStatus,
        deploymentId: audit.productionRuntimeObservation.deploymentId,
        branch: audit.productionRuntimeObservation.branch,
      },
      readAttestation,
      manifestJsonl: 'manifest',
      historyJsonl: 'history',
      watermarkJsonl: 'watermark',
      result: {
        contractVersion: 'v143_fandex_momentum_output_form_eligibility_research_v1',
        sourceContractVersion:
          'v142_fandex_momentum_cross_family_combination_research_v1',
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
          recommendedVariableId:
            'momentum.cross-family-evidence-state.research',
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
      },
      sourceEvidence: {
        lastfmEvidenceId:
          '723cf73abb93882779edc0621a12381ab80e464c',
        lastfmLatestComponentEndAt: '2026-09-20T01:59:13.000Z',
        naverEvidenceId: audit.sourceSnapshot.naverEvidenceId,
        naverThroughSlotStart: audit.sourceSnapshot.naverThroughSlotStart,
      },
      evaluatedAt: audit.reproducedAt,
      recordedAt: audit.reproducedAt,
      manifestedAt: audit.reproducedAt,
    },
    {
      evaluateRefresh: ((input: any) => {
        refreshCalls += 1;
        assert.equal(input.provenance.digest, audit.result.digest);
        assert.equal(
          input.provenance.state,
          'stored-evidence-read-reproduced',
        );
        assert.equal(
          input.provenance.storedEvidenceReproducedThisEvaluation,
          true,
        );
        return {
          contractVersion:
            'v158_fandex_momentum_provenance_gated_current_live_refresh_research_v1',
          state: 'refresh-prepared',
          canonicalArtistId: 'iu',
          provenanceDigest: input.provenance.digest,
          provenanceState: input.provenance.state,
          sourceEvidenceMatched: true,
          preflightInvoked: true,
          preflight: null,
          readyForPhysicalPersistence: true,
          blockers: [],
          effects: {
            productMetricReads: 0,
            productMetricWrites: 0,
            previewFallbackReads: 0,
            databaseWrites: 0,
            historyWrites: 0,
            watermarkWrites: 0,
            manifestWrites: 0,
          },
          digest: '9'.repeat(64),
        };
      }) as any,
    },
  );

  assert.equal(refreshCalls, 1);
  assert.equal(out.state, 'refresh-evaluated');
  assert.equal(out.attestation.state, 'attested-provenance-ready');
  assert.equal(out.refreshInvoked, true);
  assert.equal(out.refresh?.state, 'refresh-prepared');
  assert.equal(out.readyForPhysicalPersistence, true);
  assert.deepEqual(out.blockers, []);
});


test('committed v159 current audit preserves the unattested 00Z block and rollback boundary', async () => {
  const [auditRaw, watermarkJsonl, manifestJsonl] = await Promise.all([
    readFile(
      new URL(
        '../data/momentum-research/iu_stored_evidence_attestation_v159_20260921T013500Z.json',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../data/momentum-research/iu_evaluation_watermark_v151.jsonl',
        import.meta.url,
      ),
      'utf8',
    ),
    readFile(
      new URL(
        '../data/momentum-research/iu_paired_artifact_manifest_v154.jsonl',
        import.meta.url,
      ),
      'utf8',
    ),
  ]);
  const audit = JSON.parse(auditRaw);

  const out = evaluateFandexMomentumStoredEvidenceAttestationResearch({
    snapshot: currentSnapshot,
    runtimeObservation: currentRuntime,
    readAttestation: null,
  });

  assert.equal(
    audit.contractVersion,
    'v159_fandex_momentum_current_stored_evidence_attestation_audit_v1',
  );
  assert.equal(
    audit.attestationBoundary.callerSuppliedReproducedBooleanAllowed,
    false,
  );
  assert.equal(audit.attestationBoundary.currentReadAttestationPresent, false);
  assert.equal(audit.attestationBoundary.currentReadAttestationAccepted, false);
  assert.equal(
    audit.attestationBoundary.storedEvidenceReproducedThisEvaluation,
    false,
  );
  assert.equal(out.provenance.digest, audit.derivedProvenance.digest);
  assert.equal(out.provenance.state, audit.derivedProvenance.state);
  assert.equal(out.provenance.futureLiveRefreshEligible, false);
  assert.deepEqual(out.provenance.blockers, audit.derivedProvenance.blockers);

  let refreshCalls = 0;
  const official = evaluateFandexMomentumAttestedRefreshResearch(
    {
      snapshot: currentSnapshot,
      runtimeObservation: currentRuntime,
      readAttestation: null,
      manifestJsonl,
      historyJsonl: '',
      watermarkJsonl,
      result: {
        contractVersion: 'v143_fandex_momentum_output_form_eligibility_research_v1',
        sourceContractVersion:
          'v142_fandex_momentum_cross_family_combination_research_v1',
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
          recommendedVariableId:
            'momentum.cross-family-evidence-state.research',
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
      },
      sourceEvidence: {
        lastfmEvidenceId:
          '723cf73abb93882779edc0621a12381ab80e464c',
        lastfmLatestComponentEndAt: '2026-09-20T01:59:13.000Z',
        naverEvidenceId: currentSnapshot.naverEvidenceId,
        naverThroughSlotStart: currentSnapshot.naverThroughSlotStart,
      },
      evaluatedAt: audit.auditedAt,
      recordedAt: audit.auditedAt,
      manifestedAt: audit.auditedAt,
    },
    {
      evaluateRefresh: (() => {
        refreshCalls += 1;
        throw new Error('v158_must_not_run');
      }) as any,
    },
  );

  assert.equal(refreshCalls, 0);
  assert.equal(official.state, audit.officialRefreshEntrypoint.state);
  assert.equal(
    official.refreshInvoked,
    audit.officialRefreshEntrypoint.refreshInvoked,
  );
  assert.equal(
    official.readyForPhysicalPersistence,
    audit.officialRefreshEntrypoint.readyForPhysicalPersistence,
  );
  assert.deepEqual(official.blockers, audit.officialRefreshEntrypoint.blockers);

  const watermarks = watermarkJsonl.split(/\r?\n/).filter(Boolean);
  const manifests = manifestJsonl.split(/\r?\n/).filter(Boolean);
  assert.equal(watermarks.length, audit.rollback.currentWatermarkRecordCount);
  assert.equal(manifests.length, audit.rollback.currentManifestRecordCount);
  assert.equal(
    JSON.parse(watermarks.at(-1)!).sequence,
    audit.rollback.currentWatermarkLatestSequence,
  );
  assert.equal(
    JSON.parse(manifests.at(-1)!).sequence,
    audit.rollback.currentManifestLatestSequence,
  );
  assert.equal(audit.productBoundary.productMomentumScore, null);
  assert.equal(audit.productBoundary.productionEligible, false);
  assert.equal(audit.productBoundary.productProductionActual, '0/7');
});


test('committed current 00Z Neon read attestation reproduces exact v159 provenance', async () => {
  const raw = await readFile(
    new URL(
      '../data/momentum-research/iu_stored_evidence_attestation_v159_20260921T012400Z.json',
      import.meta.url,
    ),
    'utf8',
  );
  const audit = JSON.parse(raw);

  const out = evaluateFandexMomentumStoredEvidenceAttestationResearch({
    snapshot: {
      canonicalArtistId: audit.canonicalArtistId,
      naverEvidenceId: audit.sourceSnapshot.naverEvidenceId,
      naverCollectionKey: audit.sourceSnapshot.naverCollectionKey,
      naverThroughSlotStart: audit.sourceSnapshot.naverThroughSlotStart,
      naverStatus: audit.sourceSnapshot.naverStatus,
      naverRawEvidenceCount: audit.sourceSnapshot.naverRawEvidenceCount,
      naverNormalizedRecordCount:
        audit.sourceSnapshot.naverNormalizedRecordCount,
      naverDuplicateRecordCount:
        audit.sourceSnapshot.naverDuplicateRecordCount,
      naverRejectedItemCount:
        audit.sourceSnapshot.naverRejectedItemCount,
    },
    runtimeObservation: {
      observedAt: audit.productionRuntimeObservation.observedAt,
      requestPath: audit.productionRuntimeObservation.requestPath,
      httpStatus: audit.productionRuntimeObservation.httpStatus,
      deploymentId: audit.productionRuntimeObservation.deploymentId,
      branch: audit.productionRuntimeObservation.branch,
    },
    readAttestation: audit.readAttestation,
  });

  assert.equal(out.state, 'attested-provenance-ready');
  assert.equal(out.readAttestationPresent, true);
  assert.equal(out.readAttestationAccepted, true);
  assert.equal(out.storedEvidenceReproducedThisEvaluation, true);
  assert.equal(out.provenance.state, 'stored-evidence-read-reproduced');
  assert.equal(
    out.provenance.digest,
    '9e7c1c47694d2ffa76f71818fecca565cf4f4c584db92d01708d15445a0e8f1d',
  );
  assert.equal(
    out.digest,
    '27f65870158f3eb6d8f639e307df5340afc950abbd13bf9a5b455663829711af',
  );
  assert.equal(out.provenance.futureLiveRefreshEligible, true);
  assert.deepEqual(out.blockers, []);
  assert.equal(
    audit.neonReadOnlyReproduction.auditFingerprintPurpose,
    'read-integrity-only-not-methodology',
  );
  assert.deepEqual(out.effects, {
    productMetricReads: 0,
    productMetricWrites: 0,
    previewFallbackReads: 0,
    databaseWrites: 0,
  });
});
