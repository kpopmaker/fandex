import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('final activation revision is exact-head owner-approval-gated and non-Render-mutating', async () => {
  const value = JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-v2-final-activation-revision-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as {
    state: string;
    activationRevisionSha: string | null;
    activationRevisionShaBinding: string;
    cutoverApprovalEvidenceRef: string | null;
    readiness: {
      state: string;
      ownerApprovalVerificationMode: string;
      checkedInOwnerAuthorities: boolean;
      v1FallbackSuppressionBound: boolean;
      renderDispatchMutationPerformed: boolean;
      newGenerationProviderCallPerformed: boolean;
    };
    v1FallbackSuppression: {
      scheduleTriggersRemovedInRevision: boolean;
      workflowDispatchRetained: boolean;
      liveMainMutationOccursOnlyOnMerge: boolean;
    };
    renderCutover: {
      currentDispatchWorkflow: string;
      targetDispatchWorkflow: string;
      mutationPrepared: boolean;
      mutationPerformed: boolean;
    };
    ownerApproval: {
      issue: number;
      requiredAuthorLogin: string;
      requiredAuthorAssociation: string;
      canonicalRebaselineAuthorizedInCheckedInRevision: boolean;
      newGenerationProviderExecutionAuthorizedInCheckedInRevision: boolean;
      schedulerCutoverAuthorizedInCheckedInRevision: boolean;
      authorityMaterialization: string;
    };
    boundaryPolicy: {
      measurementWindowStart: string | null;
      measurementWindowEnd: string | null;
      historicalV1ReceiptsReinterpreted: boolean;
      syntheticBackfillAllowed: boolean;
      retrospectiveProviderObservationAllowed: boolean;
      retrospectiveReceiptSynthesisAllowed: boolean;
    };
    authorityBoundary: {
      providerSubmissionAuthorized: boolean;
      productionCollectionAuthorized: boolean;
      productActivationAuthorized: boolean;
    };
  };

  assert.equal(value.state, 'prepared-exact-owner-approval-required');
  assert.equal(value.activationRevisionSha, null);
  assert.equal(
    value.activationRevisionShaBinding,
    'final-git-head-external-owner-approval',
  );
  assert.equal(value.cutoverApprovalEvidenceRef, null);

  assert.equal(
    value.readiness.state,
    'activation-ready-owner-approval-required',
  );
  assert.equal(
    value.readiness.ownerApprovalVerificationMode,
    'runtime-github-issue-comment-exact-revision-v1',
  );
  assert.equal(value.readiness.checkedInOwnerAuthorities, false);
  assert.equal(value.readiness.v1FallbackSuppressionBound, true);
  assert.equal(value.readiness.renderDispatchMutationPerformed, false);
  assert.equal(value.readiness.newGenerationProviderCallPerformed, false);

  assert.equal(
    value.v1FallbackSuppression.scheduleTriggersRemovedInRevision,
    true,
  );
  assert.equal(value.v1FallbackSuppression.workflowDispatchRetained, true);
  assert.equal(
    value.v1FallbackSuppression.liveMainMutationOccursOnlyOnMerge,
    true,
  );

  assert.equal(
    value.renderCutover.currentDispatchWorkflow,
    'execute-sns-fandom-youtube-render-trigger-v1.yml',
  );
  assert.equal(
    value.renderCutover.targetDispatchWorkflow,
    'execute-sns-fandom-youtube-v2-render-trigger-v1.yml',
  );
  assert.equal(value.renderCutover.mutationPrepared, true);
  assert.equal(value.renderCutover.mutationPerformed, false);

  assert.equal(value.ownerApproval.issue, 509);
  assert.equal(value.ownerApproval.requiredAuthorLogin, 'kpopmaker');
  assert.equal(value.ownerApproval.requiredAuthorAssociation, 'OWNER');
  assert.equal(
    value.ownerApproval.canonicalRebaselineAuthorizedInCheckedInRevision,
    false,
  );
  assert.equal(
    value.ownerApproval.newGenerationProviderExecutionAuthorizedInCheckedInRevision,
    false,
  );
  assert.equal(
    value.ownerApproval.schedulerCutoverAuthorizedInCheckedInRevision,
    false,
  );
  assert.equal(
    value.ownerApproval.authorityMaterialization,
    'durable-issue509-comment-after-final-exact-head',
  );

  assert.equal(value.boundaryPolicy.measurementWindowStart, null);
  assert.equal(value.boundaryPolicy.measurementWindowEnd, null);
  assert.equal(value.boundaryPolicy.historicalV1ReceiptsReinterpreted, false);
  assert.equal(value.boundaryPolicy.syntheticBackfillAllowed, false);
  assert.equal(value.boundaryPolicy.retrospectiveProviderObservationAllowed, false);
  assert.equal(value.boundaryPolicy.retrospectiveReceiptSynthesisAllowed, false);

  assert.equal(value.authorityBoundary.providerSubmissionAuthorized, false);
  assert.equal(value.authorityBoundary.productionCollectionAuthorized, false);
  assert.equal(value.authorityBoundary.productActivationAuthorized, false);
});
