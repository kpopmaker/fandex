import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  authorizeMomentumProductActivation,
  type MomentumProductActivationApproval,
} from '../lib/product/activation/momentumProductActivationAuthorization';
import {
  getMomentumProductActivationApprovalCandidateForIU,
} from '../lib/server/product/momentumProductActivationApprovalCandidate';
import {
  getMomentumProductActivationReadinessForIU,
} from '../lib/server/product/momentumProductActivationReadiness';
import { sha256Canonical } from '../lib/shared/canonicalDigest';

const EVIDENCE_URL = new URL(
  '../data/momentum-product/iu_momentum_product_activation_owner_attestation_evidence_v1.json',
  import.meta.url,
);

test('owner-attestation evidence package exactly matches the current candidate', async () => {
  const [raw, candidate] = await Promise.all([
    readFile(EVIDENCE_URL, 'utf8'),
    getMomentumProductActivationApprovalCandidateForIU(),
  ]);
  const evidence = JSON.parse(raw) as Record<string, any>;

  assert.equal(candidate.status, 'ready-for-owner-attestation');
  if (candidate.status !== 'ready-for-owner-attestation') return;

  assert.equal(
    evidence.contractVersion,
    'momentum-product-activation-owner-attestation-evidence-v1',
  );
  assert.equal(
    evidence.evaluatedAgainstMain,
    '5432eb814d8c2e97e25339406b116c98c0851039',
  );
  assert.equal(evidence.canonicalArtistId, 'iu');
  assert.equal(evidence.candidate.status, 'ready-for-owner-attestation');
  assert.deepEqual(evidence.candidate.approvalDraft, candidate.approval);
  assert.deepEqual(
    evidence.candidate.authorizationWithoutApproval,
    candidate.authorizationWithoutApproval,
  );

  assert.equal(
    evidence.freshnessEvidence.historicalCarrier.alignmentCutoffAt,
    '2026-09-20T01:59:13.000Z',
  );
  assert.equal(
    evidence.freshnessEvidence.currentNoOpEvaluation.evaluatedAlignmentCutoffAt,
    '2026-09-27T02:10:05.000Z',
  );
  assert.equal(
    evidence.freshnessEvidence.currentNoOpEvaluation.attestationDigest,
    'b1f4262f07bc3727b089b2de248128637b36c78afae6d3a9b8207a05f9e19b93',
  );

  assert.equal(evidence.boundary.ownerApprovalRecorded, false);
  assert.equal(evidence.boundary.activationAuthorizationId, null);
  assert.equal(evidence.boundary.authorizedAt, null);
  assert.equal(evidence.boundary.productActivationAuthorized, false);
  assert.equal(evidence.boundary.productPublicationAuthorized, false);
  assert.equal(evidence.boundary.publicRouteActivated, false);
  assert.equal(evidence.boundary.databaseWrites, 0);
  assert.equal(evidence.boundary.registryMutations, 0);
  assert.equal(evidence.boundary.productionVerifierExecutions, 0);
  assert.equal(
    evidence.requiredNextGate,
    'explicit-momentum-product-activation-authorization',
  );

  const { evidenceDigest, ...digestInput } = evidence;
  assert.equal(
    sha256Canonical(digestInput),
    'cd3cabbd37c603d6094c0add2fc000011897123ec82501d23b32bbe872258ce1',
  );
  assert.equal(
    evidenceDigest,
    'cd3cabbd37c603d6094c0add2fc000011897123ec82501d23b32bbe872258ce1',
  );
});

test('a stale current-evaluation attestation cannot authorize activation', async () => {
  const [readiness, candidate] = await Promise.all([
    getMomentumProductActivationReadinessForIU(),
    getMomentumProductActivationApprovalCandidateForIU(),
  ]);

  assert.equal(candidate.status, 'ready-for-owner-attestation');
  if (candidate.status !== 'ready-for-owner-attestation') return;

  const approval: MomentumProductActivationApproval = Object.freeze({
    ...candidate.approval,
    activationAuthorizationId: 'ops-activation-momentum-freshness-test-v1',
    authorizedAt: '2026-09-27T14:50:00.000Z',
    binding: Object.freeze({
      ...candidate.approval.binding,
      currentEvaluationAttestationDigest: 'f'.repeat(64),
    }),
  });

  const result = authorizeMomentumProductActivation({
    readiness,
    approval,
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;

  assert.equal(result.reason, 'activation-approval-binding-mismatch');
  assert.equal(result.activationAuthorized, false);
  assert.equal(result.productPublicationAuthorized, false);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.productMomentumScore, null);
});
