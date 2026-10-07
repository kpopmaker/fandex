import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('final v2 activation revision is owner-approval-gated and suppresses v1 scheduled fallback', async () => {
  const readiness = JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-v2-cutover-runtime-readiness-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as {
    state: string;
    generationRoot: string;
    cutoverGuards: {
      exactAuthorizedRevisionRequired: boolean;
      durableIssue509ApprovalEvidenceRequired: boolean;
      ownerApprovalVerificationMode: string;
      canonicalRebaselineAuthorized: boolean;
      newGenerationProviderExecutionAuthorized: boolean;
      schedulerCutoverAuthorized: boolean;
      v1FallbackSuppressionBound: boolean;
      cutoverApprovalEvidenceRef: string | null;
      renderDispatchMutationPerformed: boolean;
      newGenerationProviderCallPerformed: boolean;
    };
    boundaryPolicy: {
      measurementWindowStart: string | null;
      measurementWindowEnd: string | null;
      historicalV1ReceiptsReinterpreted: boolean;
      syntheticBackfillAllowed: boolean;
      retrospectiveReceiptSynthesisAllowed: boolean;
      retrospectiveProviderObservationAllowed: boolean;
    };
  };

  assert.equal(readiness.state, 'activation-ready-owner-approval-required');
  assert.equal(
    readiness.generationRoot,
    'sns-fandom/youtube-audit/recurring/v2',
  );
  assert.equal(readiness.cutoverGuards.exactAuthorizedRevisionRequired, true);
  assert.equal(
    readiness.cutoverGuards.durableIssue509ApprovalEvidenceRequired,
    true,
  );
  assert.equal(
    readiness.cutoverGuards.ownerApprovalVerificationMode,
    'runtime-github-issue-comment-exact-revision-v1',
  );

  // Owner authority is never pre-baked into the revision itself.
  assert.equal(readiness.cutoverGuards.canonicalRebaselineAuthorized, false);
  assert.equal(
    readiness.cutoverGuards.newGenerationProviderExecutionAuthorized,
    false,
  );
  assert.equal(readiness.cutoverGuards.schedulerCutoverAuthorized, false);

  // This revision is the one that binds v1 scheduled fallback suppression.
  assert.equal(readiness.cutoverGuards.v1FallbackSuppressionBound, true);
  assert.equal(readiness.cutoverGuards.cutoverApprovalEvidenceRef, null);
  assert.equal(readiness.cutoverGuards.renderDispatchMutationPerformed, false);
  assert.equal(readiness.cutoverGuards.newGenerationProviderCallPerformed, false);

  assert.equal(readiness.boundaryPolicy.measurementWindowStart, null);
  assert.equal(readiness.boundaryPolicy.measurementWindowEnd, null);
  assert.equal(readiness.boundaryPolicy.historicalV1ReceiptsReinterpreted, false);
  assert.equal(readiness.boundaryPolicy.syntheticBackfillAllowed, false);
  assert.equal(readiness.boundaryPolicy.retrospectiveReceiptSynthesisAllowed, false);
  assert.equal(readiness.boundaryPolicy.retrospectiveProviderObservationAllowed, false);

  const v2Workflow = await readFile(
    new URL(
      '../.github/workflows/execute-sns-fandom-youtube-v2-render-trigger-v1.yml',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(v2Workflow, /workflow_dispatch:/);
  assert.doesNotMatch(v2Workflow, /\nschedule:/);
  assert.match(v2Workflow, /issues: read/);
  assert.match(v2Workflow, /approved-render-sns-fandom-v2-cutover-v1/);
  assert.match(
    v2Workflow,
    /approved-sns-fandom-v2-rebaseline-provider-scheduler-cutover-v1/,
  );
  assert.match(
    v2Workflow,
    /activation-ready-owner-approval-required/,
  );
  assert.match(
    v2Workflow,
    /guards\.canonicalRebaselineAuthorized !== false/,
  );
  assert.match(
    v2Workflow,
    /guards\.newGenerationProviderExecutionAuthorized !== false/,
  );
  assert.match(
    v2Workflow,
    /guards\.schedulerCutoverAuthorized !== false/,
  );
  assert.match(
    v2Workflow,
    /guards\.v1FallbackSuppressionBound !== true/,
  );
  assert.match(
    v2Workflow,
    /runtime-github-issue-comment-exact-revision-v1/,
  );
  assert.match(
    v2Workflow,
    /guards\.cutoverApprovalEvidenceRef !== null/,
  );
  assert.match(
    v2Workflow,
    /snsFandomYoutubeV2CutoverApprovalEvidenceVerifierV1\.ts/,
  );
  assert.match(v2Workflow, /inputs\.authorized_revision_sha/);

  const v1Workflow = await readFile(
    new URL(
      '../.github/workflows/execute-sns-fandom-youtube-recurring-measurement-v1.yml',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(v1Workflow, /workflow_dispatch:/);
  assert.doesNotMatch(v1Workflow, /\nschedule:/);
  assert.doesNotMatch(v1Workflow, /cron: '17 \* \* \* \*'/);
  assert.doesNotMatch(v1Workflow, /cron: '47 \* \* \* \*'/);
});
