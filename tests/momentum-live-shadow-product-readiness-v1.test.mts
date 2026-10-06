import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateMomentumLiveShadowProductReadiness,
  type MomentumLiveShadowSourceCurrentnessAudit,
} from '../lib/product/readiness/momentumLiveShadowProductReadiness';
import {
  getMomentumEvidenceConsensusShadowProductForIU,
} from '../lib/server/product/momentumEvidenceConsensusRealProductRead';
import {
  getMomentumLiveShadowProductReadinessForIU,
} from '../lib/server/product/momentumLiveShadowProductReadiness';
import { sha256Canonical } from '../lib/shared/canonicalDigest';

const AUDIT_URL = new URL(
  '../data/momentum-product/iu_momentum_live_shadow_source_currentness_audit_v1.json',
  import.meta.url,
);
const ATTESTATION_URL = new URL(
  '../data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json',
  import.meta.url,
);

async function readAudit(): Promise<MomentumLiveShadowSourceCurrentnessAudit> {
  return JSON.parse(
    await readFile(AUDIT_URL, 'utf8'),
  ) as MomentumLiveShadowSourceCurrentnessAudit;
}

test('current IU live-shadow readiness accepts the 2026-10-06 read-only no-op evaluation', async () => {
  const result = await getMomentumLiveShadowProductReadinessForIU();

  assert.equal(result.state, 'public-route-candidate');
  assert.equal(result.runtimeShadowReadVerified, true);
  assert.equal(result.productActivationReady, false);
  assert.equal(result.productPublicationReady, false);
  assert.equal(result.publicRouteDesignReady, true);
  assert.equal(result.productMomentumScore, null);
  assert.equal(result.numericProductEligible, false);
  assert.equal(result.previewFallbackAllowed, false);

  assert.deepEqual(result.currentCarrier, {
    carrierRecordId:
      '6bf29ed2e15a4c374f9985279e5d60e44eab404371fd807b62adad1bebf6cadd',
    alignmentCutoffAt: '2026-09-20T01:59:13.000Z',
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    historicalOnly: false,
  });

  assert.equal(
    result.sourceCurrentness.lastfmSourceAdvancedBeyondCarrierCutoff,
    true,
  );
  assert.equal(
    result.sourceCurrentness.naverCurrentStoredEvidenceReproducedForReadiness,
    true,
  );
  assert.deepEqual(result.currentEvaluation, {
    performed: true,
    currentCarrierProduced: false,
    currentNoOpEvaluationAttested: true,
    satisfiesFreshness: true,
    evaluatedAlignmentCutoffAt: '2026-10-06T03:33:21.000Z',
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    attestationPath: null,
    attestationDigest:
      'c672354c652f0eec16487c1399a83d5511151eba8d7b1332d1ef51275bdd93a2',
  });
  assert.deepEqual(result.blockers, []);
});

test('freshness policy still forbids arbitrary age thresholds and does not require a history append', async () => {
  const result = await getMomentumLiveShadowProductReadinessForIU();

  assert.deepEqual(result.freshnessPolicy, {
    arbitraryAgeThresholdAllowed: false,
    maximumAgeDays: null,
    currentCategoricalEvaluationRequiredAfterSourceAdvancement: true,
    newHistoryObservationRequiredBeforeEvaluation: false,
    historyAppendDecision: 'defer-until-current-evaluation',
  });
});

test('current source audit binds 2026-10-06 Last.fm, Blob-only NAVER, and workflow attestation evidence', async () => {
  const audit = await readAudit();

  assert.equal(
    audit.evaluatedAgainstMain,
    '01d7d03047946691560163cc968621a55ae4d755',
  );
  assert.equal(audit.lastfm.snapshotDate, '2026-10-06');
  assert.equal(audit.lastfm.historyRowCount, 607);
  assert.equal(audit.lastfm.snapshotDateCount, 58);
  assert.equal(audit.lastfm.deltaReadyCount, 19);
  assert.equal(audit.lastfm.needsReviewCount, 0);
  assert.equal(audit.lastfm.currentHistoryValid, true);
  assert.ok(audit.naverBlobOnlyRecurring);
  if (!audit.naverBlobOnlyRecurring) return;
  assert.equal(
    audit.naverBlobOnlyRecurring.mode,
    'github-actions-direct-blob-only',
  );
  assert.equal(audit.naverBlobOnlyRecurring.workflowRunId, 37455371774);
  assert.equal(audit.naverBlobOnlyRecurring.workflowJobId, 112241560366);
  assert.equal(
    audit.naverBlobOnlyRecurring.currentStoredEvidenceReproducedForReadiness,
    true,
  );
  assert.equal(
    audit.currentEvaluation.currentDualSourceCategoricalEvaluationPerformed,
    true,
  );
  assert.equal(audit.currentEvaluation.currentNoOpEvaluationAttested, true);
  assert.equal(
    audit.currentEvaluation.evaluatedAlignmentCutoffAt,
    '2026-10-06T03:33:21.000Z',
  );
  assert.equal(
    audit.currentEvaluation.attestationDigest,
    'c672354c652f0eec16487c1399a83d5511151eba8d7b1332d1ef51275bdd93a2',
  );
  assert.equal(
    audit.currentEvaluation.attestationWorkflow?.workflowRunId,
    37455528430,
  );
  assert.equal(
    audit.currentEvaluation.attestationWorkflow?.workflowJobId,
    112242072242,
  );
});

test('invalid Blob-only recurring evidence fails closed', async () => {
  const [runtimeShadow, audit] = await Promise.all([
    getMomentumEvidenceConsensusShadowProductForIU(),
    readAudit(),
  ]);
  assert.ok(audit.naverBlobOnlyRecurring);
  if (!audit.naverBlobOnlyRecurring) return;

  const invalid = {
    ...audit,
    naverBlobOnlyRecurring: {
      ...audit.naverBlobOnlyRecurring,
      runStatus: 'failed',
    },
  } as unknown as MomentumLiveShadowSourceCurrentnessAudit;

  const result = evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow,
    sourceAudit: invalid,
  });

  assert.equal(result.state, 'blocked');
  assert.ok(result.blockers.includes('source-currentness-audit-invalid'));
});

test('current dual-source attestation preserves the v140 to v143 non-numeric boundary', async () => {
  const attestation = JSON.parse(
    await readFile(ATTESTATION_URL, 'utf8'),
  ) as Readonly<{
    attestationDigest: string;
    lastfm: Readonly<{
      nativeValue: number;
      previousNativeValue: number;
      direction: string;
    }>;
    naver: Readonly<{
      latestOfficialThroughSlotStart: string;
      continuityVerification: Readonly<{
        verifiedJobCount: number;
        allCanonicalObservationSetsIdentical: boolean;
      }>;
      v140: Readonly<{
        selectedForV141ThroughSlotStart: string;
        selectedDirection: string;
      }>;
    }>;
    v141: Readonly<{
      state: string;
      futureEvidenceUsed: boolean;
    }>;
    v142: Readonly<{
      directionalConsensus: string;
      persistenceConsensus: string;
      productMomentumScore: null;
    }>;
    v143: Readonly<{
      outputForm: string;
      productMomentumScore: null;
    }>;
    comparison: Readonly<{
      classification: string;
      newHistoryObservationRequired: boolean;
    }>;
    boundary: Readonly<{
      databaseWrites: number;
      productActivations: number;
      productPublications: number;
      publicRouteCutovers: number;
      productionVerifierExecutions: number;
    }>;
  }> & Record<string, unknown>;

  const digest = attestation.attestationDigest;
  const payload: Record<string, unknown> = { ...attestation };
  delete payload.attestationDigest;

  assert.equal(
    sha256Canonical(payload),
    digest,
  );
  assert.equal(attestation.lastfm.nativeValue, 20.78);
  assert.equal(attestation.lastfm.previousNativeValue, 20.27);
  assert.equal(attestation.lastfm.direction, 'up');
  assert.equal(attestation.naver.latestOfficialThroughSlotStart, '2026-09-27T11:00:00.000Z');
  assert.equal(attestation.naver.continuityVerification.verifiedJobCount, 33);
  assert.equal(attestation.naver.continuityVerification.allCanonicalObservationSetsIdentical, true);
  assert.equal(attestation.naver.v140.selectedForV141ThroughSlotStart, '2026-09-26T19:00:00.000Z');
  assert.equal(attestation.naver.v140.selectedDirection, 'flat');
  assert.equal(attestation.v141.state, 'aligned-normalized-research');
  assert.equal(attestation.v141.futureEvidenceUsed, false);
  assert.equal(attestation.v142.directionalConsensus, 'direction-conflicted');
  assert.equal(attestation.v142.persistenceConsensus, 'persistence-not-applicable');
  assert.equal(attestation.v142.productMomentumScore, null);
  assert.equal(attestation.v143.outputForm, 'structured-categorical-evidence');
  assert.equal(attestation.v143.productMomentumScore, null);
  assert.equal(attestation.comparison.classification, 'attested-current-no-op');
  assert.equal(attestation.comparison.newHistoryObservationRequired, false);
  assert.equal(attestation.boundary.databaseWrites, 0);
  assert.equal(attestation.boundary.productActivations, 0);
  assert.equal(attestation.boundary.productPublications, 0);
  assert.equal(attestation.boundary.publicRouteCutovers, 0);
  assert.equal(attestation.boundary.productionVerifierExecutions, 0);
});

test('a mismatched future no-op attestation still fails closed', async () => {
  const [runtimeShadow, audit] = await Promise.all([
    getMomentumEvidenceConsensusShadowProductForIU(),
    readAudit(),
  ]);

  const mismatchedAudit: MomentumLiveShadowSourceCurrentnessAudit = {
    ...audit,
    carrier: {
      ...audit.carrier,
      historicalOnly: false,
    },
    currentEvaluation: {
      currentDualSourceCategoricalEvaluationPerformed: true,
      currentCarrierProduced: false,
      currentNoOpEvaluationAttested: true,
      evaluatedAlignmentCutoffAt: '2026-09-28T02:14:17.000Z',
      directionalConsensus: 'direction-corroborated-up',
      persistenceConsensus: audit.carrier.persistenceConsensus,
      attestationPath:
        'data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json',
      attestationDigest:
        'b1f4262f07bc3727b089b2de248128637b36c78afae6d3a9b8207a05f9e19b93',
    },
  };

  const result = evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow,
    sourceAudit: mismatchedAudit,
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.publicRouteDesignReady, false);
  assert.ok(result.blockers.includes('source-currentness-audit-invalid'));
});

test('runtime carrier and currentness audit mismatch fails closed', async () => {
  const [runtimeShadow, audit] = await Promise.all([
    getMomentumEvidenceConsensusShadowProductForIU(),
    readAudit(),
  ]);

  const mismatchedAudit: MomentumLiveShadowSourceCurrentnessAudit = {
    ...audit,
    carrier: {
      ...audit.carrier,
      carrierRecordId: 'f'.repeat(64),
    },
  };

  const result = evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow,
    sourceAudit: mismatchedAudit,
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.publicRouteDesignReady, false);
  assert.ok(
    result.blockers.includes('runtime-carrier-source-audit-mismatch'),
  );
});


function directAuditFrom(
  audit: MomentumLiveShadowSourceCurrentnessAudit,
  input: Readonly<{
    storedEvidenceReproduced: boolean;
    currentEvaluation?: MomentumLiveShadowSourceCurrentnessAudit['currentEvaluation'];
    historicalOnly?: boolean;
    status?: string;
    exactOfficialProtocol?: boolean;
  }>,
): MomentumLiveShadowSourceCurrentnessAudit {
  const status = input.status ?? 'applied';
  const exactOfficialProtocol = input.exactOfficialProtocol ?? true;

  return {
    contractVersion: audit.contractVersion,
    evaluatedAgainstMain: audit.evaluatedAgainstMain,
    canonicalArtistId: audit.canonicalArtistId,
    carrier: {
      ...audit.carrier,
      historicalOnly: input.historicalOnly ?? audit.carrier.historicalOnly,
    },
    lastfm: { ...audit.lastfm },
    naverDirectRecurring: {
      mode: 'github-actions-direct-recurring',
      observedAt: '2026-09-30T14:20:00.000Z',
      workflowRunId: 36730000001,
      workflowJobId: 109930000001,
      workflowHeadSha:
        'c87ac80196bc5c8b06230ec8cb0d245ca88bfac0',
      slotStart: '2026-09-30T14:00:00.000Z',
      collectionKey:
        'sched-v125-naver-news-20260930t140000z-direct001',
      status,
      exactOfficialProtocol,
      schedulerObservedAfterCarrierCutoff: true,
      currentStoredEvidenceReproducedForReadiness:
        input.storedEvidenceReproduced,
    },
    freshnessPolicy: { ...audit.freshnessPolicy },
    currentEvaluation:
      input.currentEvaluation ?? { ...audit.currentEvaluation },
  } as unknown as MomentumLiveShadowSourceCurrentnessAudit;
}

test('GitHub Actions direct recurring evidence is accepted as a second readiness channel', async () => {
  const [runtimeShadow, audit] = await Promise.all([
    getMomentumEvidenceConsensusShadowProductForIU(),
    readAudit(),
  ]);

  const directAudit = directAuditFrom(audit, {
    storedEvidenceReproduced: false,
  });

  const result = evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow,
    sourceAudit: directAudit,
  });

  assert.equal(result.state, 'current-categorical-evaluation-required');
  assert.equal(result.runtimeShadowReadVerified, true);
  assert.equal(
    result.sourceCurrentness.naverSchedulerObservedAfterCarrierCutoff,
    true,
  );
  assert.equal(
    result.sourceCurrentness.naverCurrentStoredEvidenceReproducedForReadiness,
    false,
  );
  assert.ok(
    !result.blockers.includes('source-currentness-audit-invalid'),
  );
  assert.ok(
    result.blockers.includes(
      'current-naver-stored-evidence-not-reproduced-for-readiness',
    ),
  );
});

test('direct recurring Stored Evidence can satisfy current no-op freshness without Vercel route evidence', async () => {
  const [runtimeShadow, audit] = await Promise.all([
    getMomentumEvidenceConsensusShadowProductForIU(),
    readAudit(),
  ]);

  const directAudit = directAuditFrom(audit, {
    storedEvidenceReproduced: true,
    historicalOnly: false,
    currentEvaluation: {
      currentDualSourceCategoricalEvaluationPerformed: true,
      currentCarrierProduced: false,
      currentNoOpEvaluationAttested: true,
      evaluatedAlignmentCutoffAt: '2026-09-30T02:10:05.000Z',
      directionalConsensus: audit.carrier.directionalConsensus,
      persistenceConsensus: audit.carrier.persistenceConsensus,
      attestationPath:
        'data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json',
      attestationDigest:
        'b1f4262f07bc3727b089b2de248128637b36c78afae6d3a9b8207a05f9e19b93',
    },
  });

  const result = evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow,
    sourceAudit: directAudit,
  });

  assert.equal(result.state, 'public-route-candidate');
  assert.equal(result.publicRouteDesignReady, true);
  assert.equal(result.productActivationReady, false);
  assert.equal(result.productPublicationReady, false);
  assert.equal(result.productMomentumScore, null);
  assert.equal(result.numericProductEligible, false);
  assert.equal(result.previewFallbackAllowed, false);
  assert.equal(result.currentEvaluation.satisfiesFreshness, true);
  assert.deepEqual(result.blockers, []);
});

test('invalid direct recurring execution evidence fails closed', async () => {
  const [runtimeShadow, audit] = await Promise.all([
    getMomentumEvidenceConsensusShadowProductForIU(),
    readAudit(),
  ]);

  const invalidDirectAudit = directAuditFrom(audit, {
    storedEvidenceReproduced: true,
    status: 'failed',
  });

  const result = evaluateMomentumLiveShadowProductReadiness({
    runtimeShadow,
    sourceAudit: invalidDirectAudit,
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.publicRouteDesignReady, false);
  assert.ok(result.blockers.includes('source-currentness-audit-invalid'));
});
