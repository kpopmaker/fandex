import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeQuotaOwnerHandoff,
  type SnsFandomYoutubeQuotaOwnerHandoffInput,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaOwnerHandoff';

function input(
  overrides: Partial<SnsFandomYoutubeQuotaOwnerHandoffInput> = {},
): SnsFandomYoutubeQuotaOwnerHandoffInput {
  return {
    measurementWindowStart: '2026-10-01T00:00:00.000Z',
    measurementWindowEnd: '2026-10-02T00:00:00.000Z',
    reactionSnapshotRunsPerDay: 2,
    cadenceEvidenceRef: 'external://youtube-audit/reaction-cadence',
    measurementWindowComplete: true,
    observedThrough: '2026-10-02T00:00:00.000Z',
    measurementWindowCompletionEvidenceRef:
      'external://youtube-audit/completed-window',
    measuredAt: '2026-10-02T12:00:00.000Z',
    uploadManifestPageCountPerReactionRun: 5,
    videoCountPerReactionRun: 120,
    measuredUsageEvidenceRef: 'external://youtube-audit/measured-usage',
    requestBatchingStrategy: 'provider-limit-evidenced',
    channelIdsPerCall: 50,
    videoIdsPerCall: 50,
    requestBatchingEvidenceRef:
      'external://youtube-audit/client-request-batching',
    maxChannelIdsPerCall: 50,
    maxVideoIdsPerCall: 50,
    providerBatchLimitEvidenceRef:
      'external://youtube-audit/provider-batch-limits',
    ...overrides,
  };
}

test('empty owner input keeps all real plan and measurement evidence unresolved', () => {
  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff({
    measurementWindowStart: null,
    measurementWindowEnd: null,
    reactionSnapshotRunsPerDay: null,
    cadenceEvidenceRef: null,
    measurementWindowComplete: false,
    observedThrough: null,
    measurementWindowCompletionEvidenceRef: null,
    measuredAt: null,
    uploadManifestPageCountPerReactionRun: null,
    videoCountPerReactionRun: null,
    measuredUsageEvidenceRef: null,
    requestBatchingStrategy: null,
    channelIdsPerCall: null,
    videoIdsPerCall: null,
    requestBatchingEvidenceRef: null,
    maxChannelIdsPerCall: null,
    maxVideoIdsPerCall: null,
    providerBatchLimitEvidenceRef: null,
  });

  assert.equal(result.state, 'awaiting-owner-plan-evidence');
  assert.deepEqual(result.missingPlanFields, [
    'cadenceEvidenceRef',
    'measurementWindowEnd',
    'measurementWindowStart',
    'reactionSnapshotRunsPerDay',
  ]);
  assert.deepEqual(result.missingMeasurementFields, [
    'channelIdsPerCall',
    'measuredAt',
    'measuredUsageEvidenceRef',
    'measurementWindowCompletionEvidenceRef',
    'observedThrough',
    'requestBatchingEvidenceRef',
    'requestBatchingStrategy',
    'uploadManifestPageCountPerReactionRun',
    'videoCountPerReactionRun',
    'videoIdsPerCall',
  ]);
  assert.deepEqual(
    result.completionBlockers,
    ['measurement-window-incomplete'],
  );
  assert.equal(result.automaticProviderCallAllowed, false);
  assert.equal(result.collectionExecutionAuthorized, false);
  assert.equal(result.providerSubmissionAuthorized, false);
});

test('complete plan evidence can become measurement-plan-ready while measured outputs remain null', () => {
  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff(
    input({
      measurementWindowComplete: false,
      observedThrough: null,
      measurementWindowCompletionEvidenceRef: null,
      measuredAt: null,
      uploadManifestPageCountPerReactionRun: null,
      videoCountPerReactionRun: null,
      measuredUsageEvidenceRef: null,
      requestBatchingStrategy:
        'singleton-only-until-provider-batch-limit-evidence',
      channelIdsPerCall: 1,
      videoIdsPerCall: 1,
      requestBatchingEvidenceRef:
        'repo://lib/intelligence/snsFandomPointYoutubeQuotaMeasurementHandoff.ts#singleton-only-until-provider-batch-limit-evidence',
      maxChannelIdsPerCall: null,
      maxVideoIdsPerCall: null,
      providerBatchLimitEvidenceRef: null,
    }),
  );

  assert.equal(result.state, 'measurement-plan-ready');
  assert.deepEqual(result.missingPlanFields, []);
  assert.equal(result.reactionSnapshotRunsPerDay, 2);
  assert.equal(result.measurementWindowComplete, false);
  assert.deepEqual(
    result.completionBlockers,
    ['measurement-window-incomplete'],
  );
  assert.equal(result.measuredAt, null);
  assert.equal(
    result.requestBatchingStrategy,
    'singleton-only-until-provider-batch-limit-evidence',
  );
  assert.equal(result.channelIdsPerCall, 1);
  assert.equal(result.videoIdsPerCall, 1);
  assert.equal(result.maxChannelIdsPerCall, null);
  assert.equal(result.maxVideoIdsPerCall, null);
  assert.equal(result.automaticProviderCallAllowed, false);
  assert.equal(result.collectionExecutionAuthorized, false);
});

test('complete measured inputs can become quota-worksheet-input-ready without authorizing execution', () => {
  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff(input());

  assert.equal(result.state, 'quota-worksheet-input-ready');
  assert.deepEqual(result.missingPlanFields, []);
  assert.deepEqual(result.missingMeasurementFields, []);
  assert.deepEqual(result.invalidFields, []);
  assert.equal(result.uploadManifestPageCountPerReactionRun, 5);
  assert.equal(result.videoCountPerReactionRun, 120);
  assert.equal(result.requestBatchingStrategy, 'provider-limit-evidenced');
  assert.equal(result.channelIdsPerCall, 50);
  assert.equal(result.videoIdsPerCall, 50);
  assert.equal(result.maxChannelIdsPerCall, 50);
  assert.equal(result.maxVideoIdsPerCall, 50);
  assert.equal(result.automaticProviderCallAllowed, false);
  assert.equal(result.collectionExecutionAuthorized, false);
  assert.equal(result.schedulerMutationAllowed, false);
  assert.equal(result.deploymentAuthorized, false);
  assert.equal(result.providerSubmissionAuthorized, false);
});

test('invalid window order, cadence, counts, and secret-like refs fail closed', () => {
  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff(
    input({
      measurementWindowStart: '2026-10-02T00:00:00.000Z',
      measurementWindowEnd: '2026-10-01T00:00:00.000Z',
      reactionSnapshotRunsPerDay: 0,
      uploadManifestPageCountPerReactionRun: 0,
      videoIdsPerCall: -1,
      cadenceEvidenceRef:
        'external://cadence?access_token=do-not-store-this',
    }),
  );

  assert.equal(result.state, 'awaiting-owner-plan-evidence');
  assert.ok(result.invalidFields.includes('measurementWindowOrder'));
  assert.ok(result.invalidFields.includes('reactionSnapshotRunsPerDay'));
  assert.ok(
    result.invalidFields.includes(
      'uploadManifestPageCountPerReactionRun',
    ),
  );
  assert.ok(result.invalidFields.includes('videoIdsPerCall'));
  assert.ok(
    result.invalidFields.includes('cadenceEvidenceRef:secret-like'),
  );
});

test('checked-in owner template records the owner-approved plan while Phase C stays unresolved', async () => {
  const raw = JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-quota-owner-input-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Record<string, unknown>;

  assert.equal(raw.state, 'measurement-plan-ready');
  assert.equal(raw.measurementWindowStart, '2026-10-03T15:00:00.000Z');
  assert.equal(raw.measurementWindowEnd, '2027-10-04T15:00:00.000Z');
  assert.equal(raw.reactionSnapshotRunsPerDay, 24);
  assert.equal(raw.measurementWindowComplete, false);
  assert.equal(raw.observedThrough, null);
  assert.equal(raw.measurementWindowCompletionEvidenceRef, null);
  assert.equal(
    raw.cadenceEvidenceRef,
    'github-issue://kpopmaker/fandex/issues/424#issuecomment-5967962631',
  );

  for (const field of [
    'measuredAt',
    'uploadManifestPageCountPerReactionRun',
    'videoCountPerReactionRun',
    'measuredUsageEvidenceRef',
    'maxChannelIdsPerCall',
    'maxVideoIdsPerCall',
    'providerBatchLimitEvidenceRef',
  ]) {
    assert.equal(raw[field], null);
  }
  assert.equal(
    raw.requestBatchingStrategy,
    'singleton-only-until-provider-batch-limit-evidence',
  );
  assert.equal(raw.channelIdsPerCall, 1);
  assert.equal(raw.videoIdsPerCall, 1);
  assert.equal(
    raw.requestBatchingEvidenceRef,
    'repo://lib/intelligence/snsFandomPointYoutubeQuotaMeasurementHandoff.ts#singleton-only-until-provider-batch-limit-evidence',
  );

  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff(
    raw as unknown as SnsFandomYoutubeQuotaOwnerHandoffInput,
  );

  assert.equal(result.state, 'measurement-plan-ready');
  assert.deepEqual(result.missingPlanFields, []);
  assert.equal(result.measurementWindowStart, '2026-10-03T15:00:00.000Z');
  assert.equal(result.measurementWindowEnd, '2027-10-04T15:00:00.000Z');
  assert.equal(result.reactionSnapshotRunsPerDay, 24);
  assert.equal(result.measurementWindowComplete, false);
  assert.deepEqual(
    result.completionBlockers,
    ['measurement-window-incomplete'],
  );
  assert.equal(result.cadenceEvidenceRef, 'github-issue://kpopmaker/fandex/issues/424#issuecomment-5967962631');
  assert.equal(
    result.requestBatchingStrategy,
    'singleton-only-until-provider-batch-limit-evidence',
  );
  assert.equal(result.channelIdsPerCall, 1);
  assert.equal(result.videoIdsPerCall, 1);
  assert.equal(result.automaticProviderCallAllowed, false);
  assert.equal(result.collectionExecutionAuthorized, false);
  assert.equal(result.schedulerMutationAllowed, false);
  assert.equal(result.deploymentAuthorized, false);
  assert.equal(result.providerSubmissionAuthorized, false);
});


test('singleton client batching resolves without provider maximum evidence', () => {
  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff(
    input({
      requestBatchingStrategy:
        'singleton-only-until-provider-batch-limit-evidence',
      channelIdsPerCall: 1,
      videoIdsPerCall: 1,
      requestBatchingEvidenceRef:
        'repo://lib/intelligence/snsFandomPointYoutubeQuotaMeasurementHandoff.ts#singleton-only-until-provider-batch-limit-evidence',
      maxChannelIdsPerCall: null,
      maxVideoIdsPerCall: null,
      providerBatchLimitEvidenceRef: null,
    }),
  );

  assert.equal(result.state, 'quota-worksheet-input-ready');
  assert.deepEqual(result.missingMeasurementFields, []);
  assert.deepEqual(result.invalidFields, []);
  assert.equal(result.maxChannelIdsPerCall, null);
  assert.equal(result.maxVideoIdsPerCall, null);
  assert.equal(result.providerBatchLimitEvidenceRef, null);
});

test('provider-limit batching still requires provider maxima and evidence', () => {
  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff(
    input({
      requestBatchingStrategy: 'provider-limit-evidenced',
      maxChannelIdsPerCall: null,
      maxVideoIdsPerCall: null,
      providerBatchLimitEvidenceRef: null,
    }),
  );

  assert.equal(result.state, 'measurement-plan-ready');
  assert.ok(result.missingMeasurementFields.includes('maxChannelIdsPerCall'));
  assert.ok(result.missingMeasurementFields.includes('maxVideoIdsPerCall'));
  assert.ok(
    result.missingMeasurementFields.includes('providerBatchLimitEvidenceRef'),
  );
});


test('observed zero included-video count is true zero rather than missing', () => {
  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff(
    input({
      videoCountPerReactionRun: 0,
    }),
  );

  assert.equal(result.state, 'quota-worksheet-input-ready');
  assert.deepEqual(result.missingMeasurementFields, []);
  assert.deepEqual(result.invalidFields, []);
  assert.equal(result.videoCountPerReactionRun, 0);
});
