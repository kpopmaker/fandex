import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateFandexMomentumRecoveryContinuityFromRepository,
  evaluateFandexMomentumRecoveryContinuityGate,
  FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT,
  FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
} from '../lib/intelligence/fandexMomentumRecoveryContinuityGate';
import {
  bindCanonicalArtistToNaverNews,
} from '../lib/server/ingestion/naverNewsArtistBinding';
import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
} from '../lib/server/ingestion/naverNewsContracts';
import type {
  NaverNewsLatestOfficialShadowSlotReadRepository,
  NaverNewsSucceededSchedulerJob,
} from '../lib/server/ingestion/naverNewsLatestOfficialShadowSlot';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
} from '../lib/server/ingestion/naverNewsScheduler';
import {
  createObjectStoreNaverNewsLatestOfficialShadowSlotRepository,
  mirrorNaverNewsStoredEvidence,
  stageNaverNewsStoredEvidenceMirror,
} from '../lib/server/ingestion/naverNewsStoredEvidenceMirror';
import type {
  ImmutableTextObjectPutResult,
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';

class MemoryImmutableStore implements ImmutableTextObjectStore {
  readonly values = new Map<string, string>();

  async readText(pathname: string) {
    return this.values.get(pathname) ?? null;
  }

  async listPathnames(prefix: string) {
    return [...this.values.keys()]
      .filter((pathname) => pathname.startsWith(prefix))
      .sort();
  }

  async putTextIfAbsent(
    pathname: string,
    body: string,
  ): Promise<ImmutableTextObjectPutResult> {
    const existing = this.values.get(pathname);
    if (existing === undefined) {
      this.values.set(pathname, body);
      return { status: 'created', pathname };
    }
    if (existing === body) {
      return { status: 'idempotent-existing', pathname };
    }
    return { status: 'conflict', pathname };
  }
}

function hourly(start: string, count: number): string[] {
  const base = Date.parse(start);
  return Array.from({ length: count }, (_, index) =>
    new Date(base + index * 60 * 60 * 1_000).toISOString());
}

function officialJob(slotStart: string): NaverNewsSucceededSchedulerJob {
  const binding = bindCanonicalArtistToNaverNews('iu');
  const plan = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: slotStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  const identity = buildNaverNewsJobIdentity(plan.command);

  return Object.freeze({
    jobId: identity.jobId,
    collectionKey: plan.collectionKey,
    requestContract: identity.request,
  });
}

function repository(
  jobs: readonly NaverNewsSucceededSchedulerJob[],
): NaverNewsLatestOfficialShadowSlotReadRepository {
  return Object.freeze({
    async readSucceededSchedulerJobs() {
      return jobs;
    },
  });
}

function mirrorPlanAt(slotStart: string) {
  const binding = bindCanonicalArtistToNaverNews('iu');
  const scheduler = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: slotStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  const identity = buildNaverNewsJobIdentity(scheduler.command);
  return buildNaverNewsIngestionWritePlan(identity, {
    fetchedAt: new Date(Date.parse(slotStart) + 5 * 60_000).toISOString(),
    response: {
      lastBuildDate:
        new Date(Date.parse(slotStart) + 4 * 60_000).toISOString(),
      total: 1,
      start: 1,
      display: 1,
      items: [
        {
          title: '아이유 recovery continuity evidence',
          originallink: 'https://news.example.test/iu-recovery',
          description: 'validated recovery continuity fixture',
          pubDate:
            new Date(Date.parse(slotStart) - 20 * 60_000).toISOString(),
        },
      ],
    },
  });
}

test('derives the recovery requirement from the frozen replicated-cycle baseline', () => {
  assert.equal(FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT, 48);
  assert.equal(FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT, 49);
});

test('does not bridge the observed 00Z to 07Z outage with synthetic slots', () => {
  const value = evaluateFandexMomentumRecoveryContinuityGate([
    '2026-10-01T00:00:00.000Z',
    '2026-10-01T07:00:00.000Z',
  ]);

  assert.equal(value.state, 'continuity-building');
  assert.equal(value.candidateProtocolStart, '2026-10-01T07:00:00.000Z');
  assert.equal(value.contiguousSuccessfulSlotCount, 1);
  assert.equal(value.missingSlotsSynthesized, false);
  assert.equal(value.backfillAuthorized, false);
  assert.equal(value.activationAllowed, false);
});

test('qualifies only after one bootstrap plus 48 contiguous analysis slots', () => {
  const slots = hourly(
    '2026-10-01T07:00:00.000Z',
    FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
  );
  const value = evaluateFandexMomentumRecoveryContinuityGate(slots);

  assert.equal(value.state, 'continuity-qualified-candidate');
  assert.equal(value.candidateProtocolStart, '2026-10-01T07:00:00.000Z');
  assert.equal(
    value.latestSuccessfulSlotStart,
    '2026-10-03T07:00:00.000Z',
  );
  assert.equal(value.contiguousSuccessfulSlotCount, 49);
  assert.equal(value.activationAllowed, false);
  assert.equal(value.productionOperationsApprovalRequired, true);
});

test('a later gap resets the candidate start to the latest contiguous suffix', () => {
  const slots = [
    ...hourly('2026-10-01T07:00:00.000Z', 10),
    ...hourly('2026-10-02T00:00:00.000Z', 5),
  ];
  const value = evaluateFandexMomentumRecoveryContinuityGate(slots);

  assert.equal(value.state, 'continuity-building');
  assert.equal(value.candidateProtocolStart, '2026-10-02T00:00:00.000Z');
  assert.equal(value.contiguousSuccessfulSlotCount, 5);
});

test('rejects duplicate slot evidence rather than counting it twice', () => {
  assert.throws(
    () => evaluateFandexMomentumRecoveryContinuityGate([
      '2026-10-01T07:00:00.000Z',
      '2026-10-01T07:00:00.000Z',
    ]),
    /momentum_recovery_continuity_duplicate_slot/,
  );
});

test('repository adapter preserves the same continuity semantics for exact official jobs', async () => {
  const value =
    await evaluateFandexMomentumRecoveryContinuityFromRepository(
      repository([
        officialJob('2026-10-01T00:00:00.000Z'),
        officialJob('2026-10-01T07:00:00.000Z'),
      ]),
    );

  assert.equal(value.state, 'continuity-building');
  assert.equal(value.candidateProtocolStart, '2026-10-01T07:00:00.000Z');
  assert.equal(value.latestSuccessfulSlotStart, '2026-10-01T07:00:00.000Z');
  assert.equal(value.contiguousSuccessfulSlotCount, 1);
});

test('repository adapter ignores scheduler-shaped rows that are not exact official protocol evidence', async () => {
  const valid = officialJob('2026-10-01T07:00:00.000Z');
  const mismatched = officialJob('2026-10-01T08:00:00.000Z');
  const value =
    await evaluateFandexMomentumRecoveryContinuityFromRepository(
      repository([
        valid,
        Object.freeze({
          ...mismatched,
          requestContract: Object.freeze({
            ...(mismatched.requestContract as Record<string, unknown>),
            query: 'not-the-canonical-iu-query',
          }),
        }),
      ]),
    );

  assert.equal(value.state, 'continuity-building');
  assert.equal(value.candidateProtocolStart, '2026-10-01T07:00:00.000Z');
  assert.equal(value.latestSuccessfulSlotStart, '2026-10-01T07:00:00.000Z');
  assert.equal(value.contiguousSuccessfulSlotCount, 1);
});

test('staged Blob job evidence is not counted as scheduler completion', async () => {
  const store = new MemoryImmutableStore();
  const plan = mirrorPlanAt('2026-10-01T14:00:00.000Z');

  await stageNaverNewsStoredEvidenceMirror(plan, store);

  const value =
    await evaluateFandexMomentumRecoveryContinuityFromRepository(
      createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(store),
    );

  assert.equal(value.state, 'no-recovery-evidence');
  assert.equal(value.contiguousSuccessfulSlotCount, 0);
  assert.equal(value.candidateProtocolStart, null);
});

test('finalized Blob official scheduler manifest feeds the same recovery gate contract', async () => {
  const store = new MemoryImmutableStore();
  const plan = mirrorPlanAt('2026-10-01T14:00:00.000Z');

  await mirrorNaverNewsStoredEvidence(plan, store);

  const value =
    await evaluateFandexMomentumRecoveryContinuityFromRepository(
      createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(store),
    );

  assert.equal(value.state, 'continuity-building');
  assert.equal(value.candidateProtocolStart, '2026-10-01T14:00:00.000Z');
  assert.equal(value.latestSuccessfulSlotStart, '2026-10-01T14:00:00.000Z');
  assert.equal(value.contiguousSuccessfulSlotCount, 1);
});
