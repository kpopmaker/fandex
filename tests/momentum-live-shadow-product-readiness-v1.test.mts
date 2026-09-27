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

test('current IU live-shadow readiness accepts the attested current no-op evaluation', async () => {
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
    result.sourceCurrentness.naverCurrentStoredEvidenceReproducedForReadiness,
    true,
  );
  assert.deepEqual(result.currentEvaluation, {
    performed: true,
    currentCarrierProduced: false,
    currentNoOpEvaluationAttested: true,
    satisfiesFreshness: true,
    evaluatedAlignmentCutoffAt: '2026-09-27T02:10:05.000Z',
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    attestationPath:
      'data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json',
    attestationDigest:
      'b1f4262f07bc3727b089b2de248128637b36c78afae6d3a9b8207a05f9e19b93',
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

test('current source audit records current Last.fm and NAVER Stored Evidence reproduction', async () => {
  const audit = await readAudit();

  assert.equal(
    audit.evaluatedAgainstMain,
    '8c766ce1c4706941cf16472b0a861dcdc4e6a497',
  );
  assert.equal(audit.lastfm.snapshotDate, '2026-09-27');
  assert.equal(audit.lastfm.historyRowCount, 490);
  assert.equal(audit.lastfm.snapshotDateCount, 49);
  assert.equal(audit.lastfm.deltaReadyCount, 10);
  assert.equal(audit.lastfm.needsReviewCount, 0);
  assert.equal(
    audit.naverRuntime.deploymentId,
    'dpl_65pZp1xsKQRRmY2xwqXDDKGNFDjx',
  );
  assert.equal(
    audit.naverRuntime.currentStoredEvidenceReproducedForReadiness,
    true,
  );
  assert.equal(
    audit.currentEvaluation.evaluatedAlignmentCutoffAt,
    '2026-09-27T02:10:05.000Z',
  );
  assert.equal(
    audit.currentEvaluation.directionalConsensus,
    'direction-conflicted',
  );
  assert.equal(
    audit.currentEvaluation.persistenceConsensus,
    'persistence-not-applicable',
  );
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

test('a mismatched no-op attestation fails closed', async () => {
  const [runtimeShadow, audit] = await Promise.all([
    getMomentumEvidenceConsensusShadowProductForIU(),
    readAudit(),
  ]);

  const mismatchedAudit: MomentumLiveShadowSourceCurrentnessAudit = {
    ...audit,
    currentEvaluation: {
      ...audit.currentEvaluation,
      directionalConsensus: 'direction-corroborated-up',
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
