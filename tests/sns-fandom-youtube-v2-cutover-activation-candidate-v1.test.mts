import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeV2CutoverActivationCandidateV1,
} from '../lib/intelligence/snsFandomPointYoutubeV2CutoverActivationCandidateV1';

function preparedInput() {
  return {
    activationRevisionSha: null,
    cutoverApprovalEvidenceRef: null,
    canonicalRebaselineAuthorized: false,
    newGenerationProviderExecutionAuthorized: false,
    schedulerCutoverAuthorized: false,
    v1FallbackSuppressionPrepared: true,
    v1FallbackSuppressionApplied: false,
    renderV2DispatchMutationPrepared: true,
    renderV2DispatchMutationApplied: false,
    v2RuntimeBound: true,
    v2EvidenceStoreBound: true,
    crossGenerationFirstSlotGuardBound: true,
  };
}

test('checked-in cutover candidate requires owner approval and performs no live mutation', async () => {
  const raw = JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-v2-cutover-activation-candidate-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as {
    state: string;
    activationRevisionSha: string | null;
    cutoverApprovalEvidenceRef: string | null;
    preparedControls: {
      v1FallbackSuppressionPrepared: boolean;
      v1FallbackSuppressionApplied: boolean;
      renderV2DispatchMutationPrepared: boolean;
      renderV2DispatchMutationApplied: boolean;
      v2RuntimeBound: boolean;
      v2EvidenceStoreBound: boolean;
      crossGenerationFirstSlotGuardBound: boolean;
    };
    ownerAuthority: {
      canonicalRebaselineAuthorized: boolean;
      newGenerationProviderExecutionAuthorized: boolean;
      schedulerCutoverAuthorized: boolean;
    };
    sameHourDuplicatePrevention: {
      firstV2SlotChecksForV1Receipt: boolean;
      ifV1ReceiptAlreadyExists: string;
      manualSameHourBackfillAllowed: boolean;
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

  const result = evaluateSnsFandomYoutubeV2CutoverActivationCandidateV1({
    activationRevisionSha: raw.activationRevisionSha,
    cutoverApprovalEvidenceRef: raw.cutoverApprovalEvidenceRef,
    ...raw.ownerAuthority,
    ...raw.preparedControls,
  });

  assert.equal(raw.state, 'prepared-owner-approval-required');
  assert.equal(result.state, 'prepared-owner-approval-required');
  assert.deepEqual(result.blockers, []);
  assert.equal(result.liveMutationPerformed, false);
  assert.equal(result.providerCallPerformed, false);
  assert.equal(
    raw.sameHourDuplicatePrevention.firstV2SlotChecksForV1Receipt,
    true,
  );
  assert.equal(
    raw.sameHourDuplicatePrevention.ifV1ReceiptAlreadyExists,
    'fail-closed-before-v2-claim-and-provider-call',
  );
  assert.equal(
    raw.sameHourDuplicatePrevention.manualSameHourBackfillAllowed,
    false,
  );
  assert.equal(raw.boundaryPolicy.measurementWindowStart, null);
  assert.equal(raw.boundaryPolicy.measurementWindowEnd, null);
  assert.equal(raw.boundaryPolicy.historicalV1ReceiptsReinterpreted, false);
  assert.equal(raw.boundaryPolicy.syntheticBackfillAllowed, false);
  assert.equal(raw.boundaryPolicy.retrospectiveReceiptSynthesisAllowed, false);
  assert.equal(raw.boundaryPolicy.retrospectiveProviderObservationAllowed, false);
});

test('partial owner authority fails closed', () => {
  const result = evaluateSnsFandomYoutubeV2CutoverActivationCandidateV1({
    ...preparedInput(),
    canonicalRebaselineAuthorized: true,
    activationRevisionSha: '1111111111111111111111111111111111111111',
    cutoverApprovalEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/509#issuecomment-12345',
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'sns-fandom-v2-cutover-provider-execution-not-authorized',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'sns-fandom-v2-cutover-scheduler-cutover-not-authorized',
    ),
  );
});

test('complete exact owner authority yields activation-ready candidate but no live action', () => {
  const result = evaluateSnsFandomYoutubeV2CutoverActivationCandidateV1({
    ...preparedInput(),
    activationRevisionSha: '1111111111111111111111111111111111111111',
    cutoverApprovalEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/509#issuecomment-12345',
    canonicalRebaselineAuthorized: true,
    newGenerationProviderExecutionAuthorized: true,
    schedulerCutoverAuthorized: true,
  });

  assert.equal(result.state, 'activation-ready-candidate');
  assert.deepEqual(result.blockers, []);
  assert.equal(result.liveMutationPerformed, false);
  assert.equal(result.providerCallPerformed, false);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.productActivationAuthorized, false);
});

test('candidate rejects live scheduler or Render mutation before activation', () => {
  const result = evaluateSnsFandomYoutubeV2CutoverActivationCandidateV1({
    ...preparedInput(),
    v1FallbackSuppressionApplied: true,
    renderV2DispatchMutationApplied: true,
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'sns-fandom-v2-cutover-live-mutation-before-activation',
    ),
  );
});

test('candidate PR leaves current live v1 workflow schedules intact', async () => {
  const workflow = await readFile(
    new URL(
      '../.github/workflows/execute-sns-fandom-youtube-recurring-measurement-v1.yml',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(workflow, /cron: '17 \* \* \* \*'/);
  assert.match(workflow, /cron: '47 \* \* \* \*'/);
  assert.match(workflow, /workflow_dispatch:/);
});
