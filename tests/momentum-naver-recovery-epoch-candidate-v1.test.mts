import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFandexMomentumNaverRecoveryEpochCandidate,
} from '../lib/intelligence/fandexMomentumNaverRecoveryEpochCandidate';

const evidence = Object.freeze({
  canonicalArtistId: 'iu',
  lastSucceededBeforeGapSlotStart: '2026-09-27T12:00:00.000Z',
  firstMissingSlotStart: '2026-09-27T13:00:00.000Z',
  firstRecoveredSucceededSlotStart: '2026-10-01T00:00:00.000Z',
  successfulSlotStartsStrictlyBetweenGapAndRecovery: Object.freeze([]),
  recoveredJob: Object.freeze({
    jobId:
      '104b763e07956126f502b9f9635eea2e4db082ed53a50b6f0a07299823b159a6',
    collectionKey:
      'sched-v125-naver-news-20261001t000000z-f1ed381d367d',
    status: 'succeeded' as const,
    rawEvidenceCount: 100,
    normalizedRecordCount: 100,
    duplicateRecordCount: 0,
    rejectedItemCount: 0,
  }),
});

test('uses the first actual recovered successful slot as the candidate start', () => {
  const value = buildFandexMomentumNaverRecoveryEpochCandidate(evidence);

  assert.equal(value.state, 'recovery-epoch-candidate');
  assert.equal(
    value.currentOfficialEpoch.protocolStart,
    '2026-09-15T16:00:00.000Z',
  );
  assert.equal(
    value.candidateEpoch.protocolStart,
    '2026-10-01T00:00:00.000Z',
  );
  assert.equal(value.candidateEpoch.backfillAllowed, false);
  assert.equal(value.decision.officialEpochMutationPerformed, false);
  assert.equal(value.decision.activationAllowed, false);
  assert.deepEqual(value.blockers, [
    'separate-official-epoch-approval-required',
    'frozen-methodology-migration-required',
  ]);
});

test('rejects a candidate when an earlier successful slot exists inside the gap', () => {
  const value = buildFandexMomentumNaverRecoveryEpochCandidate({
    ...evidence,
    successfulSlotStartsStrictlyBetweenGapAndRecovery: [
      '2026-09-30T23:00:00.000Z',
    ],
  });

  assert.equal(value.state, 'blocked');
  assert.equal(value.candidateEpoch.protocolStart, null);
  assert.ok(value.blockers.includes('earlier-recovered-success-exists'));
});

test('requires complete canonical recovered Stored Evidence', () => {
  const value = buildFandexMomentumNaverRecoveryEpochCandidate({
    ...evidence,
    recoveredJob: {
      ...evidence.recoveredJob,
      normalizedRecordCount: 99,
    },
  });

  assert.equal(value.state, 'blocked');
  assert.ok(value.blockers.includes('recovered-stored-evidence-invalid'));
});

test('requires the first missing slot to immediately follow the last success', () => {
  const value = buildFandexMomentumNaverRecoveryEpochCandidate({
    ...evidence,
    firstMissingSlotStart: '2026-09-27T14:00:00.000Z',
  });

  assert.equal(value.state, 'blocked');
  assert.ok(value.blockers.includes('outage-boundary-invalid'));
});
