import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  getMomentumProductActivationAuthorizationExecutionCandidateForIU,
} from '../lib/server/product/momentumProductActivationAuthorizationExecutionCandidate';
import { sha256Canonical } from '../lib/shared/canonicalDigest';

type AuthorizationExecutionCandidateEvidence = Readonly<{
  contractVersion: string;
  preparedFromMain: string;
  canonicalArtistId: string;
  executionCandidate: unknown;
  safetyBoundary: Readonly<{
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
  '../data/momentum-product/iu_momentum_product_activation_authorization_execution_candidate_v1.json',
  import.meta.url,
);

test('authorization execution-candidate evidence matches current runtime candidate', async () => {
  const [raw, runtimeCandidate] = await Promise.all([
    readFile(EVIDENCE_URL, 'utf8'),
    getMomentumProductActivationAuthorizationExecutionCandidateForIU(),
  ]);
  const evidence =
    JSON.parse(raw) as AuthorizationExecutionCandidateEvidence;

  assert.equal(
    evidence.contractVersion,
    'momentum-product-activation-authorization-execution-candidate-evidence-v1',
  );
  assert.equal(
    evidence.preparedFromMain,
    '68f31f9ca993b2f90e124e569dc5f1bbed299d0c',
  );
  assert.equal(evidence.canonicalArtistId, 'iu');
  assert.deepEqual(evidence.executionCandidate, runtimeCandidate);
  assert.equal(evidence.safetyBoundary.ownerApprovalRecorded, false);
  assert.equal(evidence.safetyBoundary.activationAuthorizationId, null);
  assert.equal(evidence.safetyBoundary.authorizedAt, null);
  assert.equal(evidence.safetyBoundary.productActivationAuthorized, false);
  assert.equal(evidence.safetyBoundary.productPublicationAuthorized, false);
  assert.equal(evidence.safetyBoundary.publicRouteActivated, false);
  assert.equal(evidence.safetyBoundary.databaseWrites, 0);
  assert.equal(evidence.safetyBoundary.registryMutations, 0);
  assert.equal(evidence.safetyBoundary.productionVerifierExecutions, 0);
  assert.equal(
    evidence.requiredNextGate,
    'explicit-momentum-product-activation-authorization',
  );

  const { evidenceDigest, ...digestInput } = evidence;
  assert.equal(sha256Canonical(digestInput), evidenceDigest);
  assert.equal(
    evidenceDigest,
    '940c69223422c3775f8e501ce934723cc77883c02ccd19ab716ea1f84ea8dcd1',
  );
});
