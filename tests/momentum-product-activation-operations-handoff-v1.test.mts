import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { sha256Canonical } from '../lib/shared/canonicalDigest';

type HandoffEvidence = Readonly<{
  contractVersion: string;
  preparedAgainstMain: string;
  canonicalArtistId: string;
  target: Readonly<{
    legacyVariableId: string;
    constructId: string;
  }>;
  productionDeployment: Readonly<{
    deploymentId: string;
    state: string;
    target: string;
    githubCommitRef: string;
    githubCommitSha: string;
  }>;
  evidenceBindings: Readonly<{
    currentEvaluationAttestation: Readonly<{
      path: string;
      digest: string;
      evaluatedAlignmentCutoffAt: string;
    }>;
    ownerAttestationCandidateEvidence: Readonly<{
      path: string;
      digest: string;
    }>;
    authorizationExecutionCandidateEvidence: Readonly<{
      path: string;
      digest: string;
    }>;
  }>;
  handoffDecision: Readonly<{
    status: string;
    authority: string;
    ownerApprovalRecorded: boolean;
    activationAuthorizationId: string | null;
    authorizedAt: string | null;
    productActivationAuthorized: boolean;
    productPublicationAuthorized: boolean;
    publicRouteActivated: boolean;
    publication: string;
    productMomentumScore: number | null;
    numericProductEligible: boolean;
    legacyGrowthMomentumPointReuseAllowed: boolean;
    previewFallbackAllowed: boolean;
    directProductionContributionEligible: boolean;
    requiredNextGate: string;
  }>;
  operationsBoundary: Readonly<{
    allowedBeforeExplicitAuthorization: readonly string[];
    requiresSeparateExplicitAuthorization: readonly string[];
    notAuthorizedByThisHandoff: readonly string[];
  }>;
  handoffDigest: string;
}>;

type CurrentEvaluationAttestation = Readonly<{
  comparison: Readonly<{
    currentNoOpEvaluationAttested: boolean;
    freshnessSatisfied: boolean;
  }>;
  v141: Readonly<{
    alignmentCutoffAt: string;
  }>;
  v143: Readonly<{
    productMomentumScore: null;
    numericEligibility: string;
  }>;
  boundary: Readonly<{
    productActivations: number;
    productPublications: number;
    publicRouteCutovers: number;
    productionVerifierExecutions: number;
  }>;
  attestationDigest: string;
}>;

type OwnerAttestationEvidence = Readonly<{
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

type AuthorizationExecutionCandidateEvidence = Readonly<{
  executionCandidate: Readonly<{
    status: string;
    activationAuthorized: boolean;
    productPublicationAuthorized: boolean;
    publicRouteActivated: boolean;
    publication: string;
    productMomentumScore: null;
    requiredNextGate: string;
  }>;
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
  evidenceDigest: string;
}>;

const HANDOFF_URL = new URL(
  '../data/momentum-product/iu_momentum_product_activation_operations_handoff_v1.json',
  import.meta.url,
);
const CURRENT_ATTESTATION_URL = new URL(
  '../data/momentum-product/iu_momentum_current_dual_source_evaluation_attestation_v1.json',
  import.meta.url,
);
const OWNER_EVIDENCE_URL = new URL(
  '../data/momentum-product/iu_momentum_product_activation_owner_attestation_evidence_v1.json',
  import.meta.url,
);
const EXECUTION_EVIDENCE_URL = new URL(
  '../data/momentum-product/iu_momentum_product_activation_authorization_execution_candidate_v1.json',
  import.meta.url,
);

test('Momentum activation operations handoff is bound to current main, production deployment, and evidence', async () => {
  const [handoffRaw, currentRaw, ownerRaw, executionRaw] =
    await Promise.all([
      readFile(HANDOFF_URL, 'utf8'),
      readFile(CURRENT_ATTESTATION_URL, 'utf8'),
      readFile(OWNER_EVIDENCE_URL, 'utf8'),
      readFile(EXECUTION_EVIDENCE_URL, 'utf8'),
    ]);

  const handoff = JSON.parse(handoffRaw) as HandoffEvidence;
  const current =
    JSON.parse(currentRaw) as CurrentEvaluationAttestation;
  const owner =
    JSON.parse(ownerRaw) as OwnerAttestationEvidence;
  const execution =
    JSON.parse(executionRaw) as AuthorizationExecutionCandidateEvidence;

  assert.equal(
    handoff.contractVersion,
    'momentum-product-activation-operations-handoff-v1',
  );
  assert.equal(
    handoff.preparedAgainstMain,
    '1f799902528663c35537050cf7a0b5a1a0d2a1af',
  );
  assert.equal(handoff.canonicalArtistId, 'iu');
  assert.deepEqual(handoff.target, {
    legacyVariableId: 'growthMomentumPoint',
    constructId: 'momentumEvidenceConsensus',
  });

  assert.equal(
    handoff.productionDeployment.githubCommitSha,
    handoff.preparedAgainstMain,
  );
  assert.equal(handoff.productionDeployment.githubCommitRef, 'main');
  assert.equal(handoff.productionDeployment.state, 'READY');
  assert.equal(handoff.productionDeployment.target, 'production');
  assert.equal(
    handoff.productionDeployment.deploymentId,
    'dpl_DhMkvyh9dn2Y8RDGj6P6WS5NCKVo',
  );

  assert.equal(
    handoff.evidenceBindings.currentEvaluationAttestation.digest,
    current.attestationDigest,
  );
  assert.equal(
    handoff.evidenceBindings.currentEvaluationAttestation
      .evaluatedAlignmentCutoffAt,
    current.v141.alignmentCutoffAt,
  );
  assert.equal(
    handoff.evidenceBindings.ownerAttestationCandidateEvidence.digest,
    owner.evidenceDigest,
  );
  assert.equal(
    handoff.evidenceBindings.authorizationExecutionCandidateEvidence.digest,
    execution.evidenceDigest,
  );

  assert.equal(current.comparison.currentNoOpEvaluationAttested, true);
  assert.equal(current.comparison.freshnessSatisfied, true);
  assert.equal(current.v143.productMomentumScore, null);
  assert.equal(current.v143.numericEligibility, 'not-eligible');
  assert.equal(current.boundary.productActivations, 0);
  assert.equal(current.boundary.productPublications, 0);
  assert.equal(current.boundary.publicRouteCutovers, 0);
  assert.equal(current.boundary.productionVerifierExecutions, 0);

  assert.equal(owner.boundary.ownerApprovalRecorded, false);
  assert.equal(owner.boundary.activationAuthorizationId, null);
  assert.equal(owner.boundary.authorizedAt, null);
  assert.equal(owner.boundary.productActivationAuthorized, false);
  assert.equal(owner.boundary.productPublicationAuthorized, false);
  assert.equal(owner.boundary.publicRouteActivated, false);
  assert.equal(owner.boundary.databaseWrites, 0);
  assert.equal(owner.boundary.registryMutations, 0);
  assert.equal(owner.boundary.productionVerifierExecutions, 0);
  assert.equal(
    owner.requiredNextGate,
    'explicit-momentum-product-activation-authorization',
  );

  assert.equal(
    execution.executionCandidate.status,
    'ready-for-explicit-authorization',
  );
  assert.equal(execution.executionCandidate.activationAuthorized, false);
  assert.equal(
    execution.executionCandidate.productPublicationAuthorized,
    false,
  );
  assert.equal(execution.executionCandidate.publicRouteActivated, false);
  assert.equal(execution.executionCandidate.publication, 'shadow');
  assert.equal(execution.executionCandidate.productMomentumScore, null);
  assert.equal(
    execution.executionCandidate.requiredNextGate,
    'explicit-momentum-product-activation-authorization',
  );
  assert.equal(execution.safetyBoundary.ownerApprovalRecorded, false);
  assert.equal(execution.safetyBoundary.activationAuthorizationId, null);
  assert.equal(execution.safetyBoundary.authorizedAt, null);
  assert.equal(execution.safetyBoundary.productActivationAuthorized, false);
  assert.equal(execution.safetyBoundary.productPublicationAuthorized, false);
  assert.equal(execution.safetyBoundary.publicRouteActivated, false);
  assert.equal(execution.safetyBoundary.databaseWrites, 0);
  assert.equal(execution.safetyBoundary.registryMutations, 0);
  assert.equal(execution.safetyBoundary.productionVerifierExecutions, 0);

  assert.equal(
    handoff.handoffDecision.status,
    'ready-for-operations-authorization-review',
  );
  assert.equal(
    handoff.handoffDecision.authority,
    'product-operations-owner',
  );
  assert.equal(handoff.handoffDecision.ownerApprovalRecorded, false);
  assert.equal(handoff.handoffDecision.activationAuthorizationId, null);
  assert.equal(handoff.handoffDecision.authorizedAt, null);
  assert.equal(handoff.handoffDecision.productActivationAuthorized, false);
  assert.equal(
    handoff.handoffDecision.productPublicationAuthorized,
    false,
  );
  assert.equal(handoff.handoffDecision.publicRouteActivated, false);
  assert.equal(handoff.handoffDecision.publication, 'shadow');
  assert.equal(handoff.handoffDecision.productMomentumScore, null);
  assert.equal(handoff.handoffDecision.numericProductEligible, false);
  assert.equal(
    handoff.handoffDecision.legacyGrowthMomentumPointReuseAllowed,
    false,
  );
  assert.equal(handoff.handoffDecision.previewFallbackAllowed, false);
  assert.equal(
    handoff.handoffDecision.directProductionContributionEligible,
    false,
  );
  assert.equal(
    handoff.handoffDecision.requiredNextGate,
    'explicit-momentum-product-activation-authorization',
  );

  assert.deepEqual(
    handoff.operationsBoundary.requiresSeparateExplicitAuthorization,
    [
      'record-owner-activation-approval',
      'materialize-activation-authorization-id',
      'materialize-authorized-at',
      'execute-product-activation-authorization',
    ],
  );
  assert.ok(
    handoff.operationsBoundary.notAuthorizedByThisHandoff.includes(
      'production-verifier-rerun',
    ),
  );

  const { handoffDigest, ...digestInput } = handoff;
  assert.equal(sha256Canonical(digestInput), handoffDigest);
  assert.equal(
    handoffDigest,
    'dca053af60e05e22ea30d45e030c31f85cea2931d448ef7dc108942bcc309d76',
  );
});
