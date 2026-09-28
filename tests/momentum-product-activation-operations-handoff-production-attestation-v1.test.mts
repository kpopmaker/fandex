import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { sha256Canonical } from '../lib/shared/canonicalDigest';

type OperationsHandoff = Readonly<{
  handoffDigest: string;
  handoffDecision: Readonly<{
    status: string;
    ownerApprovalRecorded: boolean;
    activationAuthorizationId: string | null;
    authorizedAt: string | null;
    productActivationAuthorized: boolean;
    productPublicationAuthorized: boolean;
    publicRouteActivated: boolean;
    publication: string;
    productMomentumScore: null;
    requiredNextGate: string;
  }>;
}>;

type ProductionAttestation = Readonly<{
  contractVersion: string;
  attestedHandoff: Readonly<{
    path: string;
    handoffDigest: string;
    mergeCommitSha: string;
    pullRequestNumber: number;
  }>;
  productionDeployment: Readonly<{
    deploymentId: string;
    state: string;
    target: string;
    githubCommitRef: string;
    githubCommitSha: string;
    aliasError: null;
  }>;
  verification: Readonly<{
    handoffMergeCommitDeployedToProduction: boolean;
    productionDeploymentReady: boolean;
    productionCommitMatchesHandoffMergeCommit: boolean;
    handoffEvidenceDigestLocked: boolean;
    ownerApprovalRecorded: boolean;
    activationAuthorizationId: string | null;
    authorizedAt: string | null;
    productActivationAuthorized: boolean;
    productPublicationAuthorized: boolean;
    publicRouteActivated: boolean;
    publication: string;
    productMomentumScore: null;
    numericProductEligible: boolean;
    legacyGrowthMomentumPointReuseAllowed: boolean;
    previewFallbackAllowed: boolean;
    productionVerifierRerunPerformed: boolean;
  }>;
  requiredNextGate: string;
  attestationDigest: string;
}>;

const HANDOFF_URL = new URL(
  '../data/momentum-product/iu_momentum_product_activation_operations_handoff_v1.json',
  import.meta.url,
);
const ATTESTATION_URL = new URL(
  '../data/momentum-product/iu_momentum_product_activation_operations_handoff_production_attestation_v1.json',
  import.meta.url,
);

test('Momentum operations handoff merge commit is attested on READY Production without authorizing activation', async () => {
  const [handoffRaw, attestationRaw] = await Promise.all([
    readFile(HANDOFF_URL, 'utf8'),
    readFile(ATTESTATION_URL, 'utf8'),
  ]);

  const handoff = JSON.parse(handoffRaw) as OperationsHandoff;
  const attestation = JSON.parse(attestationRaw) as ProductionAttestation;

  assert.equal(
    attestation.contractVersion,
    'momentum-product-activation-operations-handoff-production-attestation-v1',
  );
  assert.equal(
    attestation.attestedHandoff.path,
    'data/momentum-product/iu_momentum_product_activation_operations_handoff_v1.json',
  );
  assert.equal(
    attestation.attestedHandoff.handoffDigest,
    handoff.handoffDigest,
  );
  assert.equal(attestation.attestedHandoff.pullRequestNumber, 266);
  assert.equal(
    attestation.attestedHandoff.mergeCommitSha,
    '7e72c65951bee61e8e528ae2719f090efc662dba',
  );

  assert.equal(
    attestation.productionDeployment.deploymentId,
    'dpl_dr9sYi2UE89UzLDdgH96btEj7goJ',
  );
  assert.equal(attestation.productionDeployment.state, 'READY');
  assert.equal(attestation.productionDeployment.target, 'production');
  assert.equal(attestation.productionDeployment.githubCommitRef, 'main');
  assert.equal(
    attestation.productionDeployment.githubCommitSha,
    attestation.attestedHandoff.mergeCommitSha,
  );
  assert.equal(attestation.productionDeployment.aliasError, null);

  assert.equal(
    attestation.verification.handoffMergeCommitDeployedToProduction,
    true,
  );
  assert.equal(attestation.verification.productionDeploymentReady, true);
  assert.equal(
    attestation.verification.productionCommitMatchesHandoffMergeCommit,
    true,
  );
  assert.equal(attestation.verification.handoffEvidenceDigestLocked, true);

  assert.equal(
    handoff.handoffDecision.status,
    'ready-for-operations-authorization-review',
  );
  assert.equal(handoff.handoffDecision.ownerApprovalRecorded, false);
  assert.equal(handoff.handoffDecision.activationAuthorizationId, null);
  assert.equal(handoff.handoffDecision.authorizedAt, null);
  assert.equal(handoff.handoffDecision.productActivationAuthorized, false);
  assert.equal(handoff.handoffDecision.productPublicationAuthorized, false);
  assert.equal(handoff.handoffDecision.publicRouteActivated, false);
  assert.equal(handoff.handoffDecision.publication, 'shadow');
  assert.equal(handoff.handoffDecision.productMomentumScore, null);
  assert.equal(
    handoff.handoffDecision.requiredNextGate,
    'explicit-momentum-product-activation-authorization',
  );

  assert.equal(attestation.verification.ownerApprovalRecorded, false);
  assert.equal(attestation.verification.activationAuthorizationId, null);
  assert.equal(attestation.verification.authorizedAt, null);
  assert.equal(attestation.verification.productActivationAuthorized, false);
  assert.equal(attestation.verification.productPublicationAuthorized, false);
  assert.equal(attestation.verification.publicRouteActivated, false);
  assert.equal(attestation.verification.publication, 'shadow');
  assert.equal(attestation.verification.productMomentumScore, null);
  assert.equal(attestation.verification.numericProductEligible, false);
  assert.equal(
    attestation.verification.legacyGrowthMomentumPointReuseAllowed,
    false,
  );
  assert.equal(attestation.verification.previewFallbackAllowed, false);
  assert.equal(
    attestation.verification.productionVerifierRerunPerformed,
    false,
  );
  assert.equal(
    attestation.requiredNextGate,
    'explicit-momentum-product-activation-authorization',
  );

  const { attestationDigest, ...digestInput } = attestation;
  assert.equal(sha256Canonical(digestInput), attestationDigest);
  assert.equal(
    attestationDigest,
    'eba9f0f299ad0f591e2d0a7cb931db1d203d29fd4bf6bf402263a81a74a1ecd9',
  );
});
