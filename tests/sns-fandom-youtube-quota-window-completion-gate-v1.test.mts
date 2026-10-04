import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeQuotaOwnerHandoff,
  type SnsFandomYoutubeQuotaOwnerHandoffInput,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaOwnerHandoff';

function completeCandidate(
  overrides: Partial<SnsFandomYoutubeQuotaOwnerHandoffInput> = {},
): SnsFandomYoutubeQuotaOwnerHandoffInput {
  return {
    measurementWindowStart: '2026-10-03T15:00:00.000Z',
    measurementWindowEnd: '2027-10-04T15:00:00.000Z',
    reactionSnapshotRunsPerDay: 24,
    cadenceEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/424#issuecomment-5967962631',
    measurementWindowComplete: true,
    observedThrough: '2027-10-04T15:00:00.000Z',
    measurementWindowCompletionEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/424#completed-window-evidence',
    measuredAt: '2027-10-04T15:00:30.000Z',
    uploadManifestPageCountPerReactionRun: 115,
    videoCountPerReactionRun: 0,
    measuredUsageEvidenceRef:
      'github-actions://kpopmaker/fandex/runs/example/artifacts/example',
    requestBatchingStrategy:
      'singleton-only-until-provider-batch-limit-evidence',
    channelIdsPerCall: 1,
    videoIdsPerCall: 1,
    requestBatchingEvidenceRef:
      'repo://lib/intelligence/snsFandomPointYoutubeQuotaMeasurementHandoff.ts#singleton-only-until-provider-batch-limit-evidence',
    maxChannelIdsPerCall: null,
    maxVideoIdsPerCall: null,
    providerBatchLimitEvidenceRef: null,
    ...overrides,
  };
}

test('explicit false completion state is not Missing but blocks quota worksheet promotion', () => {
  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff(
    completeCandidate({
      measurementWindowComplete: false,
    }),
  );

  assert.equal(result.state, 'measurement-plan-ready');
  assert.equal(result.measurementWindowComplete, false);
  assert.deepEqual(result.missingMeasurementFields, []);
  assert.deepEqual(
    result.completionBlockers,
    ['measurement-window-incomplete'],
  );
  assert.equal(result.observedThrough, null);
  assert.equal(result.measuredAt, null);
  assert.equal(result.videoCountPerReactionRun, null);
});

test('completion flag cannot bypass an observed-through boundary before window end', () => {
  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff(
    completeCandidate({
      observedThrough: '2027-10-04T14:59:59.999Z',
    }),
  );

  assert.equal(result.state, 'measurement-plan-ready');
  assert.deepEqual(
    result.completionBlockers,
    ['measurement-window-observed-through-before-end'],
  );
  assert.equal(result.observedThrough, null);
  assert.equal(result.measuredAt, null);
});

test('completed-window evidence allows worksheet input readiness and preserves true zero', () => {
  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff(
    completeCandidate(),
  );

  assert.equal(result.state, 'quota-worksheet-input-ready');
  assert.deepEqual(result.missingMeasurementFields, []);
  assert.deepEqual(result.completionBlockers, []);
  assert.deepEqual(result.invalidFields, []);
  assert.equal(result.measurementWindowComplete, true);
  assert.equal(result.observedThrough, '2027-10-04T15:00:00.000Z');
  assert.equal(
    result.measurementWindowCompletionEvidenceRef,
    'github-issue://kpopmaker/fandex/issues/424#completed-window-evidence',
  );
  assert.equal(result.uploadManifestPageCountPerReactionRun, 115);
  assert.equal(result.videoCountPerReactionRun, 0);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.collectionExecutionAuthorized, false);
  assert.equal(result.schedulerMutationAllowed, false);
});
