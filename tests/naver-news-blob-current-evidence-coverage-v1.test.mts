import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
  type NaverNewsIngestionWritePlan,
} from '../lib/server/ingestion/naverNewsContracts';
import {
  buildNaverNewsSchedulerPlan,
} from '../lib/server/ingestion/naverNewsScheduler';
import {
  evaluateNaverNewsBlobCurrentEvidenceCoverage,
  projectNaverBlobCoverageToMomentumCurrentEvidence,
} from '../lib/server/ingestion/naverNewsBlobCurrentEvidenceCoverage';
import {
  NAVER_NEWS_MIRROR_MANIFEST_PREFIX,
  stageNaverNewsStoredEvidenceMirror,
} from '../lib/server/ingestion/naverNewsStoredEvidenceMirror';
import type {
  ImmutableTextObjectPutResult,
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';

function memoryStore(): ImmutableTextObjectStore & {
  entries(): ReadonlyMap<string, string>;
} {
  const rows = new Map<string, string>();
  return {
    async readText(pathname) {
      return rows.get(pathname) ?? null;
    },
    async listPathnames(prefix) {
      return [...rows.keys()]
        .filter((pathname) => pathname.startsWith(prefix))
        .sort();
    },
    async putTextIfAbsent(
      pathname,
      body,
    ): Promise<ImmutableTextObjectPutResult> {
      const existing = rows.get(pathname);
      if (existing === undefined) {
        rows.set(pathname, body);
        return Object.freeze({
          status: 'created' as const,
          pathname,
        });
      }
      if (existing === body) {
        return Object.freeze({
          status: 'idempotent-existing' as const,
          pathname,
        });
      }
      return Object.freeze({
        status: 'conflict' as const,
        pathname,
      });
    },
    entries() {
      return rows;
    },
  };
}

function planFor(slotStart: string): NaverNewsIngestionWritePlan {
  const scheduler = buildNaverNewsSchedulerPlan({
    query: '아이유 IU',
    at: slotStart,
    display: 100,
  });
  assert.equal(scheduler.slotStart, slotStart);
  const identity = buildNaverNewsJobIdentity(scheduler.command);
  return buildNaverNewsIngestionWritePlan(identity, {
    fetchedAt: new Date(Date.parse(slotStart) + 5_000).toISOString(),
    response: {
      lastBuildDate:
        new Date(Date.parse(slotStart) + 4_000).toISOString(),
      total: 1,
      start: 1,
      display: 1,
      items: [
        {
          title: '아이유 새 앨범 소식',
          originallink:
            `https://news.example.test/iu-${slotStart}`,
          description: '아이유 관련 최신 기사',
          pubDate:
            new Date(Date.parse(slotStart) - 60_000).toISOString(),
        },
      ],
    },
  });
}

test('one staged later slot is validated but cannot satisfy official series coverage', async () => {
  const store = memoryStore();
  const later = planFor('2026-10-03T02:00:00.000Z');
  await stageNaverNewsStoredEvidenceMirror(later, store);

  const coverage =
    await evaluateNaverNewsBlobCurrentEvidenceCoverage(
      {
        canonicalArtistId: 'iu',
        now: new Date('2026-10-03T02:20:00.000Z'),
      },
      store,
    );

  assert.equal(coverage.exactOfficialProtocol, true);
  assert.equal(coverage.evidenceSource, 'immutable-blob-staged-job');
  assert.equal(coverage.schedulerCompletionClaimed, false);
  assert.equal(coverage.schedulerManifestRequiredForCoverage, false);
  assert.equal(coverage.throughSlotStart, '2026-10-03T02:00:00.000Z');
  assert.equal(coverage.latestStagedJobId, later.identity.jobId);
  assert.equal(
    coverage.latestStagedCollectionKey,
    later.identity.request.collectionKey,
  );
  assert.equal(coverage.latestStagedJobValidated, true);
  assert.equal(coverage.expectedSlotCount, 2);
  assert.equal(coverage.reproducedSnapshotCount, 1);
  assert.equal(coverage.missingSlotCount, 1);
  assert.equal(
    coverage.firstMissingSlotStart,
    '2026-10-03T01:00:00.000Z',
  );
  assert.equal(coverage.seriesStatus, 'unavailable');
  assert.equal(
    coverage.currentStoredEvidenceReproducedForReadiness,
    false,
  );
  assert.equal(coverage.databaseReads, 0);
  assert.equal(coverage.databaseWrites, 0);
  assert.equal(coverage.blobWrites, 0);
  assert.equal(
    [...store.entries().keys()].some((pathname) =>
      pathname.startsWith(NAVER_NEWS_MIRROR_MANIFEST_PREFIX)
    ),
    false,
  );

  const projected =
    projectNaverBlobCoverageToMomentumCurrentEvidence(coverage);
  assert.ok(projected);
  assert.deepEqual(projected, {
    throughSlotStart: '2026-10-03T02:00:00.000Z',
    jobId: later.identity.jobId,
    collectionKey: later.identity.request.collectionKey,
    exactOfficialProtocol: true,
    seriesStatus: 'unavailable',
    expectedSlotCount: 2,
    reproducedSnapshotCount: 1,
  });
});

test('complete staged official series becomes available without claiming scheduler completion', async () => {
  const store = memoryStore();
  const first = planFor('2026-10-03T01:00:00.000Z');
  const second = planFor('2026-10-03T02:00:00.000Z');
  await stageNaverNewsStoredEvidenceMirror(first, store);
  await stageNaverNewsStoredEvidenceMirror(second, store);

  const coverage =
    await evaluateNaverNewsBlobCurrentEvidenceCoverage(
      {
        canonicalArtistId: 'iu',
        now: new Date('2026-10-03T02:20:00.000Z'),
      },
      store,
    );

  assert.equal(coverage.seriesStatus, 'available');
  assert.equal(coverage.expectedSlotCount, 2);
  assert.equal(coverage.reproducedSnapshotCount, 2);
  assert.equal(coverage.missingSlotCount, 0);
  assert.equal(coverage.firstMissingSlotStart, null);
  assert.equal(coverage.firstMissingJobId, null);
  assert.equal(
    coverage.currentStoredEvidenceReproducedForReadiness,
    true,
  );
  assert.equal(coverage.schedulerCompletionClaimed, false);
  assert.equal(
    [...store.entries().keys()].some((pathname) =>
      pathname.startsWith(NAVER_NEWS_MIRROR_MANIFEST_PREFIX)
    ),
    false,
  );

  const projected =
    projectNaverBlobCoverageToMomentumCurrentEvidence(coverage);
  assert.ok(projected);
  assert.equal(projected.seriesStatus, 'available');
  assert.equal(
    projected.reproducedSnapshotCount,
    projected.expectedSlotCount,
  );
});

test('no staged official job fails closed without inventing readiness evidence', async () => {
  const store = memoryStore();

  const coverage =
    await evaluateNaverNewsBlobCurrentEvidenceCoverage(
      {
        canonicalArtistId: 'iu',
        now: new Date('2026-10-03T02:20:00.000Z'),
      },
      store,
    );

  assert.equal(coverage.seriesStatus, 'unavailable');
  assert.equal(coverage.throughSlotStart, null);
  assert.equal(coverage.latestStagedJobId, null);
  assert.equal(coverage.currentStoredEvidenceReproducedForReadiness, false);
  assert.equal(
    projectNaverBlobCoverageToMomentumCurrentEvidence(coverage),
    null,
  );
});

test('unrelated staged job paths do not count toward official coverage', async () => {
  const store = memoryStore();
  const plan = buildNaverNewsIngestionWritePlan(
    buildNaverNewsJobIdentity({
      provider: 'naver-news',
      collectionKey: 'manual-fixture',
      query: '아이유 IU',
      display: 100,
      start: 1,
      sort: 'date',
    }),
    {
      fetchedAt: '2026-10-03T02:00:05.000Z',
      response: {
        lastBuildDate: '2026-10-03T02:00:04.000Z',
        total: 0,
        start: 1,
        display: 0,
        items: [],
      },
    },
  );
  await stageNaverNewsStoredEvidenceMirror(plan, store);

  const coverage =
    await evaluateNaverNewsBlobCurrentEvidenceCoverage(
      {
        canonicalArtistId: 'iu',
        now: new Date('2026-10-03T02:20:00.000Z'),
      },
      store,
    );

  assert.equal(coverage.throughSlotStart, null);
  assert.equal(coverage.reproducedSnapshotCount, 0);
});
