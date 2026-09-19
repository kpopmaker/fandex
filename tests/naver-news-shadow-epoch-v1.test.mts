import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getOfficialNaverNewsShadowEpoch,
  NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START,
  NAVER_NEWS_SHADOW_EPOCH_CONTRACT_VERSION,
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

const officialStart = '2026-09-15T16:00:00.000Z';

test('IU QStash-primary shadow epoch is an explicit non-Product operational contract', () => {
  const epoch = getOfficialNaverNewsShadowEpoch('iu');

  assert.equal(NAVER_NEWS_SHADOW_EPOCH_CONTRACT_VERSION, 'v1_naver_news_shadow_epoch');
  assert.equal(NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START, officialStart);
  assert.deepEqual(epoch, {
    contractVersion: 'v1_naver_news_shadow_epoch',
    lifecycle: 'shadow',
    directProductContributionEligible: false,
    canonicalArtistId: 'iu',
    triggerMode: 'qstash-primary',
    schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
    cadenceMinutes: NAVER_NEWS_SCHEDULER_CADENCE_MINUTES,
    protocolStart: officialStart,
    historicalDataBeforeProtocolStart: 'outside_epoch',
    backfillAllowed: false,
  });
  assert.equal(Object.isFrozen(epoch), true);

  const plan = buildNaverNewsSchedulerPlan({
    query: '아이유 IU',
    at: epoch.protocolStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  assert.equal(plan.slotStart, officialStart);
});

test('official series wrapper always starts at the configured epoch boundary', async () => {
  const reads: string[] = [];
  const result = await assembleOfficialNaverNewsShadowFirstSeenSeries({
    canonicalArtistId: 'iu',
    throughSlotStart: officialStart,
  }, {
    async readJobEvidence(jobId: string) {
      reads.push(jobId);
      return null;
    },
  });

  assert.equal(result.protocolStart, officialStart);
  assert.equal(result.throughSlotStart, officialStart);
  assert.equal(result.expectedSlots.length, 1);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'expected_job_missing');
  assert.deepEqual(reads, [result.expectedSlots[0].jobId]);
});

test('official series cannot be evaluated through a slot before the official epoch', async () => {
  await assert.rejects(
    () => assembleOfficialNaverNewsShadowFirstSeenSeries({
      canonicalArtistId: 'iu',
      throughSlotStart: '2026-09-15T15:00:00.000Z',
    }, {
      async readJobEvidence() {
        throw new Error('must not read');
      },
    }),
    /naver_news_shadow_first_seen_series_input_invalid/,
  );
});
