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
    measuredAt: '2026-10-02T12:00:00.000Z',
    uploadManifestPageCountPerReactionRun: 5,
    videoCountPerReactionRun: 120,
    measuredUsageEvidenceRef: 'external://youtube-audit/measured-usage',
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
    measuredAt: null,
    uploadManifestPageCountPerReactionRun: null,
    videoCountPerReactionRun: null,
    measuredUsageEvidenceRef: null,
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
    'maxChannelIdsPerCall',
    'maxVideoIdsPerCall',
    'measuredAt',
    'measuredUsageEvidenceRef',
    'providerBatchLimitEvidenceRef',
    'uploadManifestPageCountPerReactionRun',
    'videoCountPerReactionRun',
  ]);
  assert.equal(result.automaticProviderCallAllowed, false);
  assert.equal(result.collectionExecutionAuthorized, false);
  assert.equal(result.providerSubmissionAuthorized, false);
});

test('complete plan evidence can become measurement-plan-ready while measured outputs remain null', () => {
  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff(
    input({
      measuredAt: null,
      uploadManifestPageCountPerReactionRun: null,
      videoCountPerReactionRun: null,
      measuredUsageEvidenceRef: null,
      maxChannelIdsPerCall: null,
      maxVideoIdsPerCall: null,
      providerBatchLimitEvidenceRef: null,
    }),
  );

  assert.equal(result.state, 'measurement-plan-ready');
  assert.deepEqual(result.missingPlanFields, []);
  assert.equal(result.reactionSnapshotRunsPerDay, 2);
  assert.equal(result.measuredAt, null);
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
      maxVideoIdsPerCall: -1,
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
  assert.ok(result.invalidFields.includes('maxVideoIdsPerCall'));
  assert.ok(
    result.invalidFields.includes('cadenceEvidenceRef:secret-like'),
  );
});

test('checked-in owner template remains null and does not promote fixtures', async () => {
  const raw = JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-quota-owner-input-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Record<string, unknown>;

  assert.equal(raw.state, 'awaiting-owner-plan-evidence');
  for (const field of [
    'measurementWindowStart',
    'measurementWindowEnd',
    'reactionSnapshotRunsPerDay',
    'cadenceEvidenceRef',
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
  assert.equal(raw.automaticProviderCallAllowed, false);
  assert.equal(raw.collectionExecutionAuthorized, false);
  assert.equal(raw.providerSubmissionAuthorized, false);
});
