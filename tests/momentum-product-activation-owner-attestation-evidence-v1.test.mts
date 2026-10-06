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

type OwnerAttestationEvidence = Readonly<{
  contractVersion: string;
  evaluatedAgainstMain: string;
  canonicalArtistId: string;
  candidate: Readonly<{
    status: string;
    approvalDraft: unknown;
    authorizationWithoutApproval: unknown;
  }>;
  freshnessEvidence: Readonly<{
    historicalCarrier: Readonly<{
      alignmentCutoffAt: string;
    }>;
    currentNoOpEvaluation: Readonly<{
      evaluatedAlignmentCutoffAt: string;
      attestationPath: string | null;
      attestationWorkflow?: Readonly<{
        kind: string;
        workflowRunId: number;
        workflowJobId: number;
        workflowHeadSha: string;
      }>;
      attestationDigest: string;
    }>;
  }>;
  boundary: Readonly<{
    ownerApprovalRecorded: boolean;
    activationAuthorizationId: string | null;
    authorizedAt: string | null;
    productActivationAuthorized: boolean;
    productPublicationAuthorized: boolean;
    publicRouteActivated: boolean;
    databaseWrites: number;
    registryMutations: number;
    productionVerifierExecutions: number;
  }>;
  requiredNextGate: string;
  evidenceDigest: string;
}>;

const EVIDENCE_URL = new URL(
  '../data/momentum-product/iu_momentum_product_activation_owner_attestation_evidence_v1.json',
  import.meta.url,
);

test('owner-attestation evidence package exactly matches the current candidate', async () => {
  const [raw, candidate] = await Promise.all([
    readFile(EVIDENCE_URL, 'utf8'),
    getMomentumProductActivationApprovalCandidateForIU(),
  ]);
  const evidence = JSON.parse(raw) as OwnerAttestationEvidence;

  assert.equal(candidate.status, 'ready-for-owner-attestation');
  if (candidate.status !== 'ready-for-owner-attestation') return;

  assert.equal(
    evidence.contractVersion,
    'momentum-product-activation-owner-attestation-evidence-v1',
  );
  assert.equal(
    evidence.evaluatedAgainstMain,
    '68f31f9ca993b2f90e124e569dc5f1bbed299d0c',
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
    '2026-10-06T03:33:21.000Z',
  );
  assert.equal(
    evidence.freshnessEvidence.currentNoOpEvaluation.attestationDigest,
    '59fd99dbfce6b92c3fbb16ac2f1bf54bbc07787f92a4bfbb70c734c57dd6135d',
  );
  assert.equal(
    evidence.freshnessEvidence.currentNoOpEvaluation.attestationPath,
    null,
  );
  assert.deepEqual(
    evidence.freshnessEvidence.currentNoOpEvaluation.attestationWorkflow,
    {
      kind: 'github-actions-read-only-current-evaluation',
      workflowRunId: 37469812804,
      workflowJobId: 112311628571,
      workflowHeadSha:
        '68f31f9ca993b2f90e124e569dc5f1bbed299d0c',
    },
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
    '3c04309f1f3c8dcc77a06d83192a8a2ae24575edf951cd1a9611a4eb38113103',
  );
  assert.equal(
    evidenceDigest,
    '3c04309f1f3c8dcc77a06d83192a8a2ae24575edf951cd1a9611a4eb38113103',
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
