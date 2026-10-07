import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('v2 cutover readiness is checked in fail-closed with runtime exact-revision owner approval verification', async () => {
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

  assert.equal(readiness.state, 'prepared-not-activation-ready');
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
  assert.equal(readiness.cutoverGuards.canonicalRebaselineAuthorized, false);
  assert.equal(
    readiness.cutoverGuards.newGenerationProviderExecutionAuthorized,
    false,
  );
  assert.equal(readiness.cutoverGuards.schedulerCutoverAuthorized, false);
  assert.equal(readiness.cutoverGuards.v1FallbackSuppressionBound, false);
  assert.equal(readiness.cutoverGuards.cutoverApprovalEvidenceRef, null);
  assert.equal(readiness.cutoverGuards.renderDispatchMutationPerformed, false);
  assert.equal(readiness.cutoverGuards.newGenerationProviderCallPerformed, false);
  assert.equal(readiness.boundaryPolicy.measurementWindowStart, null);
  assert.equal(readiness.boundaryPolicy.measurementWindowEnd, null);
  assert.equal(readiness.boundaryPolicy.historicalV1ReceiptsReinterpreted, false);
  assert.equal(readiness.boundaryPolicy.syntheticBackfillAllowed, false);
  assert.equal(readiness.boundaryPolicy.retrospectiveReceiptSynthesisAllowed, false);
  assert.equal(readiness.boundaryPolicy.retrospectiveProviderObservationAllowed, false);

  const workflow = await readFile(
    new URL(
      '../.github/workflows/execute-sns-fandom-youtube-v2-render-trigger-v1.yml',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\nschedule:/);
  assert.match(workflow, /issues: read/);
  assert.match(workflow, /approved-render-sns-fandom-v2-cutover-v1/);
  assert.match(
    workflow,
    /approved-sns-fandom-v2-rebaseline-provider-scheduler-cutover-v1/,
  );
  assert.match(workflow, /sns_fandom_v2_cutover_readiness_blocked/);
  assert.match(
    workflow,
    /guards\.v1FallbackSuppressionBound !== true/,
  );
  assert.match(
    workflow,
    /runtime-github-issue-comment-exact-revision-v1/,
  );
  assert.match(
    workflow,
    /guards\.cutoverApprovalEvidenceRef !== null/,
  );
  assert.match(
    workflow,
    /snsFandomYoutubeV2CutoverApprovalEvidenceVerifierV1\.ts/,
  );
  assert.match(workflow, /inputs\.authorized_revision_sha/);
});
