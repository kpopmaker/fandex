import assert from 'node:assert/strict';
import test from 'node:test';

import {
  type NaverNewsCanonicalJobEvidenceReadRepository,
  type NaverNewsCanonicalJobStoredEvidence,
} from '../lib/server/ingestion/naverNewsCanonicalJobEvidence';
import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
  NAVER_NEWS_PROVIDER,
  type NaverNewsApiItem,
} from '../lib/server/ingestion/naverNewsContracts';
import { buildNaverNewsSchedulerPlan } from '../lib/server/ingestion/naverNewsScheduler';
import { assembleNaverNewsShadowFirstSeenSeries } from '../lib/server/ingestion/naverNewsShadowFirstSeenSeries';

const query = '아이유 IU';
const slot0 = '2026-09-14T00:00:00.000Z';
const slot1 = '2026-09-14T01:00:00.000Z';
const slot2 = '2026-09-14T02:00:00.000Z';

const articleA: NaverNewsApiItem = Object.freeze({
  title: '아이유 새 소식 A',
  originallink: 'https://news.example.test/iu-a',
  description: '아이유 관련 기사 A',
  pubDate: '2026-09-13T22:00:00.000Z',
});
const articleB: NaverNewsApiItem = Object.freeze({
  title: '아이유 새 소식 B',
  originallink: 'https://news.example.test/iu-b',
  description: '아이유 관련 기사 B',
  pubDate: '2026-09-13T23:00:00.000Z',
});

function storedFor(
  slotStart: string,
  items: readonly NaverNewsApiItem[],
  providerTotal = 461_733,
): Readonly<{
  jobId: string;
  stored: NaverNewsCanonicalJobStoredEvidence;
}> {
  const scheduler = buildNaverNewsSchedulerPlan({ query, at: slotStart, display: 100 });
  const identity = buildNaverNewsJobIdentity(scheduler.command);
  const fetchedAt = new Date(Date.parse(slotStart) + 5 * 60_000).toISOString();
  const writePlan = buildNaverNewsIngestionWritePlan(identity, {
    fetchedAt,
    response: {
      lastBuildDate: fetchedAt,
      total: providerTotal,
      start: 1,
      display: 100,
      items,
    },
  });
  const received = writePlan.audit.find((event) => event.eventType === 'collection_received');
  assert.ok(received);
  return Object.freeze({
    jobId: identity.jobId,
    stored: Object.freeze({
      job: Object.freeze({
        jobId: identity.jobId,
        idempotencyKey: identity.idempotencyKey,
        requestSha256: identity.requestSha256,
        request: identity.request,
        provider: NAVER_NEWS_PROVIDER,
        status: 'succeeded',
        normalizedRecordCount: writePlan.normalizedRecords.length,
      }),
      completenessEvidence: Object.freeze({
        jobId: identity.jobId,
        provider: NAVER_NEWS_PROVIDER,
        requestContract: identity.request,
        rawEvidenceCount: writePlan.rawEvidence.length,
        collectionReceived: Object.freeze({
          jobId: identity.jobId,
          boundedPayload: received.boundedPayload,
        }),
      }),
      normalizedRecords: writePlan.normalizedRecords,
    }),
  });
}

function repository(entries: readonly ReturnType<typeof storedFor>[]): Readonly<{
  repository: NaverNewsCanonicalJobEvidenceReadRepository;
  reads: string[];
}> {
  const byJobId = new Map(entries.map((entry) => [entry.jobId, entry.stored]));
  const reads: string[] = [];
  return Object.freeze({
    reads,
    repository: Object.freeze({
      async readJobEvidence(jobId: string) {
        reads.push(jobId);
        return byJobId.get(jobId) ?? null;
      },
    }),
  });
}

test('assembles contiguous scheduler slots from stored canonical job evidence', async () => {
  const first = storedFor(slot0, [articleA]);
  const second = storedFor(slot1, [articleA, articleB]);
  const third = storedFor(slot2, [articleA, articleB]);
  const source = repository([first, second, third]);

  const result = await assembleNaverNewsShadowFirstSeenSeries({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    throughSlotStart: slot2,
  }, source.repository);

  assert.equal(result.status, 'available');
  assert.equal(result.reason, 'shadow_series_available');
  assert.equal(result.lifecycle, 'shadow');
  assert.equal(result.directProductContributionEligible, false);
  assert.deepEqual(result.expectedSlots.map((slot) => slot.jobId), [first.jobId, second.jobId, third.jobId]);
  assert.deepEqual(source.reads, [first.jobId, second.jobId, third.jobId]);
  assert.equal(result.snapshots.length, 3);
  for (const snapshot of result.snapshots) {
    assert.equal(snapshot.completeness.status, 'available');
    if (snapshot.completeness.status !== 'available') throw new Error('expected available completeness');
    assert.equal(snapshot.completeness.readModel.completeness.status, 'truncated');
    assert.equal(snapshot.observationSetCoverage.status, 'proven');
  }
  assert.deepEqual(result.activity?.slots.map((slot) => slot.firstSeenObservationCount), [null, 1, 0]);
});

test('one stored slot is bootstrap only and never fabricates an activity count', async () => {
  const first = storedFor(slot0, [articleA]);
  const source = repository([first]);
  const result = await assembleNaverNewsShadowFirstSeenSeries({
    canonicalArtistId: 'iu', protocolStart: slot0, throughSlotStart: slot0,
  }, source.repository);

  assert.equal(result.status, 'bootstrap');
  assert.equal(result.reason, 'bootstrap_only');
  assert.equal(result.activity?.slots[0].firstSeenObservationCount, null);
});

test('missing expected scheduler job fails closed instead of treating the slot as zero', async () => {
  const first = storedFor(slot0, [articleA]);
  const missing = storedFor(slot1, [articleA, articleB]);
  const source = repository([first]);
  const result = await assembleNaverNewsShadowFirstSeenSeries({
    canonicalArtistId: 'iu', protocolStart: slot0, throughSlotStart: slot1,
  }, source.repository);

  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'expected_job_missing');
  assert.equal(result.missingSlotStart, slot1);
  assert.equal(result.missingJobId, missing.jobId);
  assert.equal(result.activity, null);
  assert.equal(result.snapshots.length, 1);
  assert.deepEqual(source.reads, [first.jobId, missing.jobId]);
});

test('stored collection evidence unavailability propagates to unavailable activity', async () => {
  const first = storedFor(slot0, [articleA]);
  const second = storedFor(slot1, [articleA, articleB]);
  const brokenSecond: NaverNewsCanonicalJobStoredEvidence = Object.freeze({
    ...second.stored,
    completenessEvidence: Object.freeze({
      ...second.stored.completenessEvidence,
      collectionReceived: null,
    }),
  });
  const source = repository([first, Object.freeze({ jobId: second.jobId, stored: brokenSecond })]);
  const result = await assembleNaverNewsShadowFirstSeenSeries({
    canonicalArtistId: 'iu', protocolStart: slot0, throughSlotStart: slot1,
  }, source.repository);

  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'collection_evidence_unavailable');
  assert.equal(result.activity?.status, 'unavailable');
  assert.equal(result.activity?.unavailableAtSlotStart, slot1);
});

test('stored request protocol drift fails closed even when artist query still matches', async () => {
  const first = storedFor(slot0, [articleA]);
  const driftPlan = buildNaverNewsSchedulerPlan({ query, at: slot0, display: 99 });
  const driftIdentity = buildNaverNewsJobIdentity(driftPlan.command);
  const drifted: NaverNewsCanonicalJobStoredEvidence = Object.freeze({
    ...first.stored,
    job: Object.freeze({
      ...first.stored.job,
      request: driftIdentity.request,
    }),
  });
  const source = repository([Object.freeze({ jobId: first.jobId, stored: drifted })]);

  await assert.rejects(
    () => assembleNaverNewsShadowFirstSeenSeries({
      canonicalArtistId: 'iu', protocolStart: slot0, throughSlotStart: slot0,
    }, source.repository),
    /naver_news_shadow_first_seen_series_protocol_mismatch/,
  );
});

test('misaligned or reversed slot range is rejected before reading stored evidence', async () => {
  const source = repository([]);
  await assert.rejects(
    () => assembleNaverNewsShadowFirstSeenSeries({
      canonicalArtistId: 'iu',
      protocolStart: '2026-09-14T00:30:00.000Z',
      throughSlotStart: slot1,
    }, source.repository),
    /naver_news_shadow_first_seen_series_input_invalid/,
  );
  await assert.rejects(
    () => assembleNaverNewsShadowFirstSeenSeries({
      canonicalArtistId: 'iu', protocolStart: slot1, throughSlotStart: slot0,
    }, source.repository),
    /naver_news_shadow_first_seen_series_input_invalid/,
  );
  assert.deepEqual(source.reads, []);
});


test('batch-capable repository loads the full series once without single-read fallback', async () => {
  const first = storedFor(slot0, [articleA]);
  const second = storedFor(slot1, [articleA, articleB]);
  const third = storedFor(slot2, [articleA, articleB]);
  const entries = [first, second, third];
  const byJobId = new Map(entries.map((entry) => [entry.jobId, entry.stored]));
  const singleReads: string[] = [];
  const batchReads: string[][] = [];

  const batchRepository: NaverNewsCanonicalJobEvidenceReadRepository =
    Object.freeze({
      async readJobEvidence(jobId: string) {
        singleReads.push(jobId);
        return byJobId.get(jobId) ?? null;
      },
      async readJobEvidenceBatch(jobIds: readonly string[]) {
        batchReads.push([...jobIds]);
        return new Map(
          jobIds.flatMap((jobId) => {
            const stored = byJobId.get(jobId);
            return stored ? [[jobId, stored] as const] : [];
          }),
        );
      },
    });

  const result = await assembleNaverNewsShadowFirstSeenSeries({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    throughSlotStart: slot2,
  }, batchRepository);

  assert.equal(result.status, 'available');
  assert.deepEqual(
    result.activity?.slots.map((slot) => slot.firstSeenObservationCount),
    [null, 1, 0],
  );
  assert.deepEqual(batchReads, [[first.jobId, second.jobId, third.jobId]]);
  assert.deepEqual(singleReads, []);
});

test('batch missing evidence preserves expected_job_missing instead of fabricating zero', async () => {
  const first = storedFor(slot0, [articleA]);
  const missing = storedFor(slot1, [articleA, articleB]);
  const byJobId = new Map([[first.jobId, first.stored]]);

  const batchRepository: NaverNewsCanonicalJobEvidenceReadRepository =
    Object.freeze({
      async readJobEvidence() {
        throw new Error('single-read fallback must not run');
      },
      async readJobEvidenceBatch(jobIds: readonly string[]) {
        return new Map(
          jobIds.flatMap((jobId) => {
            const stored = byJobId.get(jobId);
            return stored ? [[jobId, stored] as const] : [];
          }),
        );
      },
    });

  const result = await assembleNaverNewsShadowFirstSeenSeries({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    throughSlotStart: slot1,
  }, batchRepository);

  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'expected_job_missing');
  assert.equal(result.missingSlotStart, slot1);
  assert.equal(result.missingJobId, missing.jobId);
  assert.equal(result.activity, null);
  assert.equal(result.snapshots.length, 1);
});
