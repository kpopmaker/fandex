import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getNaverNewsShadowEpochByProtocolStart,
  getOfficialNaverNewsShadowEpoch,
  NAVER_NEWS_IU_GITHUB_RECOVERY_PROTOCOL_START,
  NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START,
  NAVER_NEWS_SHADOW_EPOCH_CONTRACT_VERSION,
  NAVER_NEWS_SHADOW_EPOCH_REGISTRY_VERSION,
} from '../lib/server/ingestion/naverNewsShadowEpoch';
import {
  assembleOfficialNaverNewsShadowFirstSeenSeries,
} from '../lib/server/ingestion/naverNewsShadowFirstSeenSeries';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_CADENCE_MINUTES,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  NAVER_NEWS_SCHEDULER_VERSION,
} from '../lib/server/ingestion/naverNewsScheduler';

const historicalStart = '2026-09-15T16:00:00.000Z';
const recoveryStart = '2026-10-01T00:00:00.000Z';

test('IU current official epoch is the evidence-bound GitHub recovery epoch', () => {
  const epoch = getOfficialNaverNewsShadowEpoch('iu');

  assert.equal(
    NAVER_NEWS_SHADOW_EPOCH_CONTRACT_VERSION,
    'v1_naver_news_shadow_epoch',
  );
  assert.equal(
    NAVER_NEWS_SHADOW_EPOCH_REGISTRY_VERSION,
    'v2_naver_news_shadow_epoch_registry',
  );
  assert.equal(
    NAVER_NEWS_IU_GITHUB_RECOVERY_PROTOCOL_START,
    recoveryStart,
  );
  assert.deepEqual(epoch, {
    contractVersion: 'v1_naver_news_shadow_epoch',
    lifecycle: 'shadow',
    directProductContributionEligible: false,
    canonicalArtistId: 'iu',
    triggerMode: 'github-actions-hourly-v1',
    schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
    cadenceMinutes: NAVER_NEWS_SCHEDULER_CADENCE_MINUTES,
    protocolStart: recoveryStart,
    historicalDataBeforeProtocolStart: 'outside_recovery_epoch',
    backfillAllowed: false,
  });
  assert.equal(Object.isFrozen(epoch), true);

  const plan = buildNaverNewsSchedulerPlan({
    query: '아이유 IU',
    at: epoch.protocolStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  assert.equal(plan.slotStart, recoveryStart);
});

test('historical QStash epoch remains recognized for deterministic reconstruction', () => {
  assert.equal(
    NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START,
    historicalStart,
  );
  const epoch = getNaverNewsShadowEpochByProtocolStart(
    'iu',
    historicalStart,
  );

  assert.equal(epoch.protocolStart, historicalStart);
  assert.equal(epoch.triggerMode, 'qstash-primary');
  assert.equal(epoch.historicalDataBeforeProtocolStart, 'outside_epoch');
  assert.equal(epoch.backfillAllowed, false);
});

test('unknown protocol start is not silently admitted as an official epoch', () => {
  assert.throws(
    () => getNaverNewsShadowEpochByProtocolStart(
      'iu',
      '2026-09-30T23:00:00.000Z',
    ),
    /naver_news_shadow_epoch_not_configured/,
  );
});

test('official series wrapper starts at the current recovery epoch boundary', async () => {
  const reads: string[] = [];
  const result = await assembleOfficialNaverNewsShadowFirstSeenSeries({
    canonicalArtistId: 'iu',
    throughSlotStart: recoveryStart,
  }, {
    async readJobEvidence(jobId: string) {
      reads.push(jobId);
      return null;
    },
  });

  assert.equal(result.protocolStart, recoveryStart);
  assert.equal(result.throughSlotStart, recoveryStart);
  assert.equal(result.expectedSlots.length, 1);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'expected_job_missing');
  assert.deepEqual(reads, [result.expectedSlots[0].jobId]);
});

test('current official series cannot be evaluated before the recovery epoch', async () => {
  await assert.rejects(
    () => assembleOfficialNaverNewsShadowFirstSeenSeries({
      canonicalArtistId: 'iu',
      throughSlotStart: '2026-09-30T23:00:00.000Z',
    }, {
      async readJobEvidence() {
        throw new Error('must not read');
      },
    }),
    /naver_news_shadow_first_seen_series_input_invalid/,
  );
});
