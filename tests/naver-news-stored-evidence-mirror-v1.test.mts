import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import type {
  ImmutableTextObjectPutResult,
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';
import {
  buildNaverNewsIngestionWritePlan,
  buildNaverNewsJobIdentity,
} from '../lib/server/ingestion/naverNewsContracts';
import {
  buildNaverNewsSchedulerPlan,
} from '../lib/server/ingestion/naverNewsScheduler';
import {
  buildNaverNewsStoredEvidenceMirrorObjects,
  createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository,
  createObjectStoreNaverNewsLatestOfficialShadowSlotRepository,
  EXPERIMENTAL_MAX_CONCURRENT_MIRROR_EVIDENCE_READS,
  finalizeNaverNewsStoredEvidenceMirrorByJobId,
  mirrorNaverNewsStoredEvidence,
  stageNaverNewsStoredEvidenceMirror,
} from '../lib/server/ingestion/naverNewsStoredEvidenceMirror';
import {
  resolveLatestOfficialNaverNewsShadowThroughSlotStart,
} from '../lib/server/ingestion/naverNewsLatestOfficialShadowSlot';

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

function planAt(slotStart: string) {
  const scheduler = buildNaverNewsSchedulerPlan({
    query: '아이유 IU',
    at: slotStart,
    display: 100,
  });
  const identity = buildNaverNewsJobIdentity(scheduler.command);
  return buildNaverNewsIngestionWritePlan(identity, {
    fetchedAt: new Date(Date.parse(slotStart) + 5 * 60_000).toISOString(),
    response: {
      lastBuildDate: new Date(Date.parse(slotStart) + 4 * 60_000).toISOString(),
      total: 2,
      start: 1,
      display: 2,
      items: [
        {
          title: '아이유 새 소식 A',
          originallink: 'https://news.example.test/iu-a',
          description: '아이유 관련 기사 A',
          pubDate: new Date(Date.parse(slotStart) - 30 * 60_000).toISOString(),
        },
        {
          title: '아이유 새 소식 B',
          originallink: 'https://news.example.test/iu-b',
          description: '아이유 관련 기사 B',
          pubDate: new Date(Date.parse(slotStart) - 20 * 60_000).toISOString(),
        },
      ],
    },
  });
}

test('validated NAVER write plan becomes immutable mirror evidence without Postgres', async () => {
  const store = new MemoryImmutableStore();
  const plan = planAt('2026-09-28T03:00:00.000Z');

  const first = await mirrorNaverNewsStoredEvidence(plan, store);
  assert.equal(first.job.status, 'created');
  assert.equal(first.schedulerManifest?.status, 'created');

  const second = await mirrorNaverNewsStoredEvidence(plan, store);
  assert.equal(second.job.status, 'idempotent-existing');
  assert.equal(second.schedulerManifest?.status, 'idempotent-existing');

  const reader =
    createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(store);
  const stored = await reader.readJobEvidence(plan.identity.jobId);

  assert.ok(stored);
  assert.equal(stored.job.jobId, plan.identity.jobId);
  assert.equal(stored.job.idempotencyKey, plan.identity.idempotencyKey);
  assert.equal(stored.job.requestSha256, plan.identity.requestSha256);
  assert.equal(stored.job.status, 'succeeded');
  assert.equal(stored.completenessEvidence.rawEvidenceCount, 2);
  assert.equal(stored.normalizedRecords.length, 2);
  assert.deepEqual(
    stored.normalizedRecords.map((record) => record.recordId),
    plan.normalizedRecords.map((record) => record.recordId),
  );
});

test('staged scheduler evidence becomes official only after canonical job-id finalization', async () => {
  const store = new MemoryImmutableStore();
  const plan = planAt('2026-10-02T01:00:00.000Z');

  await stageNaverNewsStoredEvidenceMirror(plan, store);
  const before = await createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
    store,
  ).readSucceededSchedulerJobs();
  assert.equal(before.length, 0);

  const finalized = await finalizeNaverNewsStoredEvidenceMirrorByJobId(
    plan.identity.jobId,
    plan.resultSha256,
    store,
  );
  assert.equal(finalized.schedulerManifest?.status, 'created');

  const after = await createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
    store,
  ).readSucceededSchedulerJobs();
  assert.equal(after.length, 1);
  assert.equal(after[0]?.jobId, plan.identity.jobId);
  assert.equal(after[0]?.collectionKey, plan.identity.request.collectionKey);
});

test('mirror-backed latest official slot repository resolves exact scheduler protocol', async () => {
  const store = new MemoryImmutableStore();
  // The recovery epoch begins on 2026-10-03; earlier slots cannot be official.
  const first = planAt('2026-10-03T02:00:00.000Z');
  const latest = planAt('2026-10-03T03:00:00.000Z');

  await mirrorNaverNewsStoredEvidence(first, store);
  await mirrorNaverNewsStoredEvidence(latest, store);

  const result =
    await resolveLatestOfficialNaverNewsShadowThroughSlotStart(
      createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(store),
    );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.throughSlotStart, '2026-10-03T03:00:00.000Z');
  assert.equal(result.jobId, latest.identity.jobId);
  assert.equal(result.collectionKey, latest.identity.request.collectionKey);
});

test('batch read reproduces available mirrored jobs and preserves missing jobs', async () => {
  const store = new MemoryImmutableStore();
  const first = planAt('2026-09-28T02:00:00.000Z');
  const second = planAt('2026-09-28T03:00:00.000Z');
  await mirrorNaverNewsStoredEvidence(first, store);
  await mirrorNaverNewsStoredEvidence(second, store);

  const reader =
    createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(store);
  assert.ok(reader.readJobEvidenceBatch);
  const result = await reader.readJobEvidenceBatch([
    first.identity.jobId,
    second.identity.jobId,
    'f'.repeat(64),
  ]);

  assert.equal(result.size, 2);
  assert.ok(result.has(first.identity.jobId));
  assert.ok(result.has(second.identity.jobId));
  assert.equal(result.has('f'.repeat(64)), false);
});

test('tampered mirror payload fails closed', async () => {
  const store = new MemoryImmutableStore();
  const plan = planAt('2026-09-28T03:00:00.000Z');
  const objects = buildNaverNewsStoredEvidenceMirrorObjects(plan);
  const parsed = JSON.parse(objects.jobBody);
  parsed.storedEvidence.normalizedRecords[0].title = 'tampered';

  store.values.set(objects.jobPathname, JSON.stringify(parsed));

  const reader =
    createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(store);
  await assert.rejects(
    () => reader.readJobEvidence(plan.identity.jobId),
    /naver_news_mirror_job_payload_invalid/,
  );
});

test('immutable conflict rejects overwrite instead of replacing evidence', async () => {
  const store = new MemoryImmutableStore();
  const plan = planAt('2026-09-28T03:00:00.000Z');
  const objects = buildNaverNewsStoredEvidenceMirrorObjects(plan);

  store.values.set(objects.jobPathname, '{"conflict":true}');

  await assert.rejects(
    () => mirrorNaverNewsStoredEvidence(plan, store),
    /naver_news_stored_evidence_mirror_conflict/,
  );
});

test('mirror implementation has no Postgres or runtime database dependency', async () => {
  const source = await readFile(
    new URL(
      '../lib/server/ingestion/naverNewsStoredEvidenceMirror.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(source, /\bpg\b/);
  assert.doesNotMatch(source, /FANDEX_RUNTIME_DATABASE_URL/);
  assert.doesNotMatch(source, /source_ingestion_jobs/);
  assert.doesNotMatch(source, /BEGIN READ ONLY/);
  assert.doesNotMatch(source, /INSERT INTO|UPDATE .* SET|DELETE FROM/);
});


test('Blob mirror readers cap parallel requests without dropping official slots or canonical jobs', async () => {
  const store = new MemoryImmutableStore();
  const plans = Array.from({ length: 20 }, (_, index) =>
    planAt(new Date(
      Date.parse('2026-10-01T00:00:00.000Z') + index * 60 * 60_000,
    ).toISOString()),
  );
  for (const plan of plans) {
    await mirrorNaverNewsStoredEvidence(plan, store);
  }

  let active = 0;
  let peak = 0;
  const meteredStore = {
    listPathnames: (prefix: string) => store.listPathnames(prefix),
    async readText(pathname: string): Promise<string | null> {
      active += 1;
      peak = Math.max(peak, active);
      try {
        await new Promise<void>((resolve) => setTimeout(resolve, 2));
        return store.readText(pathname);
      } finally {
        active -= 1;
      }
    },
  };

  const scheduler =
    createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
      meteredStore,
    );
  const official = await scheduler.readSucceededSchedulerJobs();
  assert.equal(official.length, plans.length);
  assert.deepEqual(
    new Set(official.map((entry) => entry.jobId)),
    new Set(plans.map((entry) => entry.identity.jobId)),
  );
  assert.ok(peak > 1);
  assert.ok(peak <= 8);
  assert.equal(active, 0);

  active = 0;
  peak = 0;
  const canonical =
    createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
      meteredStore,
    );
  assert.ok(canonical.readJobEvidenceBatch);
  const rows = await canonical.readJobEvidenceBatch([
    ...plans.map((plan) => plan.identity.jobId),
    'f'.repeat(64),
  ]);
  assert.equal(rows.size, plans.length);
  for (const plan of plans) {
    assert.equal(rows.get(plan.identity.jobId)?.job.jobId, plan.identity.jobId);
  }
  assert.ok(peak > 1);
  assert.ok(peak <= 8);
  assert.equal(active, 0);
});

test('Blob manifest reads keep eight slots working while an early request is stalled', async () => {
  const store = new MemoryImmutableStore();
  const plans = Array.from({ length: 20 }, (_, index) =>
    planAt(new Date(
      Date.parse('2026-10-03T01:00:00.000Z') + index * 60 * 60_000,
    ).toISOString()),
  );
  for (const plan of plans) await mirrorNaverNewsStoredEvidence(plan, store);

  const paths = await store.listPathnames(
    'fandex/naver-news/stored-evidence-mirror/v1/scheduler-manifests/',
  );
  const slowPath = paths[0];
  let releaseSlow!: () => void;
  const slowRead = new Promise<void>((resolve) => { releaseSlow = resolve; });
  let started = 0;
  let active = 0;
  let peak = 0;
  let slowFinished = false;
  const meteredStore = {
    listPathnames: (prefix: string) => store.listPathnames(prefix),
    async readText(pathname: string): Promise<string | null> {
      started += 1;
      active += 1;
      peak = Math.max(peak, active);
      try {
        if (pathname === slowPath) {
          await slowRead;
          slowFinished = true;
        }
        return store.readText(pathname);
      } finally {
        active -= 1;
      }
    },
  };

  const pending = createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
    meteredStore,
  ).readSucceededSchedulerJobs();
  let workContinued = false;
  try {
    for (let step = 0; step < 100; step += 1) {
      await Promise.resolve();
      if (started > 8) break;
    }
    workContinued = started > 8 && !slowFinished;
  } finally {
    releaseSlow();
  }

  const jobs = await pending;
  assert.equal(workContinued, true);
  assert.equal(jobs.length, plans.length);
  assert.deepEqual(
    new Set(jobs.map((job) => job.jobId)),
    new Set(plans.map((plan) => plan.identity.jobId)),
  );
  assert.equal(active, 0);
  assert.ok(peak <= 8);
});

test('Blob canonical reads continue past a slow first job and retain all validated jobs', async () => {
  const store = new MemoryImmutableStore();
  const plans = Array.from({ length: 20 }, (_, index) =>
    planAt(new Date(
      Date.parse('2026-10-03T01:00:00.000Z') + index * 60 * 60_000,
    ).toISOString()),
  );
  for (const plan of plans) await mirrorNaverNewsStoredEvidence(plan, store);

  const slowPath = buildNaverNewsStoredEvidenceMirrorObjects(
    plans[0]!,
  ).jobPathname;
  let releaseSlow!: () => void;
  const slowRead = new Promise<void>((resolve) => { releaseSlow = resolve; });
  let started = 0;
  let active = 0;
  let peak = 0;
  let slowFinished = false;
  const meteredStore = {
    async readText(pathname: string): Promise<string | null> {
      started += 1;
      active += 1;
      peak = Math.max(peak, active);
      try {
        if (pathname === slowPath) {
          await slowRead;
          slowFinished = true;
        }
        return store.readText(pathname);
      } finally {
        active -= 1;
      }
    },
  };

  const reader =
    createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(meteredStore);
  assert.ok(reader.readJobEvidenceBatch);
  const pending = reader.readJobEvidenceBatch(
    plans.map((plan) => plan.identity.jobId),
  );
  let workContinued = false;
  try {
    for (let step = 0; step < 100; step += 1) {
      await Promise.resolve();
      if (started > 8) break;
    }
    workContinued = started > 8 && !slowFinished;
  } finally {
    releaseSlow();
  }
  const jobs = await pending;

  assert.equal(workContinued, true);
  assert.equal(jobs.size, plans.length);
  for (const plan of plans) {
    assert.equal(jobs.get(plan.identity.jobId)?.job.jobId, plan.identity.jobId);
  }
  assert.equal(active, 0);
  assert.ok(peak <= 8);
});

test('work-conserving Blob mirror reader still rejects later corrupt immutable evidence', async () => {
  const store = new MemoryImmutableStore();
  const plans = Array.from({ length: 20 }, (_, index) =>
    planAt(new Date(
      Date.parse('2026-10-03T01:00:00.000Z') + index * 60 * 60_000,
    ).toISOString()),
  );
  for (const plan of plans) await mirrorNaverNewsStoredEvidence(plan, store);

  const corrupt = buildNaverNewsStoredEvidenceMirrorObjects(plans[14]!);
  const tampered = JSON.parse(corrupt.jobBody);
  tampered.storedEvidence.normalizedRecords[0].title = 'tampered';
  store.values.set(corrupt.jobPathname, JSON.stringify(tampered));

  const reader =
    createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(store);
  const readBatch = reader.readJobEvidenceBatch;
  assert.ok(readBatch);
  await assert.rejects(
    () => readBatch(
      plans.map((plan) => plan.identity.jobId),
    ),
    /naver_news_mirror_job_payload_invalid/,
  );
});

test('canonical Blob phase summary distinguishes remote reads and validated decode without identifiers', async () => {
  const store = new MemoryImmutableStore();
  const first = planAt('2026-10-03T01:00:00.000Z');
  const second = planAt('2026-10-03T02:00:00.000Z');
  await mirrorNaverNewsStoredEvidence(first, store);
  await mirrorNaverNewsStoredEvidence(second, store);

  const summaries: unknown[] = [];
  const reader = createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
    store,
    { onBatchReadPhaseStats: (record) => summaries.push(record) },
  );
  assert.ok(reader.readJobEvidenceBatch);
  const result = await reader.readJobEvidenceBatch([
    first.identity.jobId,
    second.identity.jobId,
    first.identity.jobId,
    'f'.repeat(64),
  ]);
  assert.equal(result.size, 2);
  assert.equal(summaries.length, 1);
  const record = summaries[0] as Record<string, unknown>;
  assert.equal(record.contractVersion, 'naver-news-mirror-canonical-read-phase-v1');
  assert.equal(record.outcome, 'fulfilled');
  assert.equal(record.objectsRequested, 3);
  assert.equal(record.objectsFound, 2);
  assert.equal(record.objectsMissing, 1);
  for (const field of [
    'remoteReadSumMs', 'remoteReadMaxMs',
    'decodeSumMs', 'decodeMaxMs', 'batchWallMs',
  ]) {
    const observed = record[field];
    assert.ok(typeof observed === 'number' && Number.isInteger(observed) && observed >= 0, field);
  }
  const serialized = JSON.stringify(record);
  assert.doesNotMatch(serialized, /아이유|news\.example|stored-evidence-mirror\/v1\//);
  assert.ok(!serialized.includes(first.identity.jobId));
  assert.ok(!serialized.includes(second.identity.jobId));
});

test('canonical phase observer cannot override original Blob evidence errors or successful reads', async () => {
  const store = new MemoryImmutableStore();
  const plan = planAt('2026-10-03T03:00:00.000Z');
  await mirrorNaverNewsStoredEvidence(plan, store);
  const withBrokenObserver = createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
    store,
    { onBatchReadPhaseStats() { throw new Error('telemetry-failed'); } },
  );
  assert.equal(
    (await withBrokenObserver.readJobEvidenceBatch!([plan.identity.jobId])).size,
    1,
  );

  const objects = buildNaverNewsStoredEvidenceMirrorObjects(plan);
  const tampered = JSON.parse(objects.jobBody);
  tampered.storedEvidence.normalizedRecords[0].title = 'tampered';
  store.values.set(objects.jobPathname, JSON.stringify(tampered));

  const summaries: { outcome: string }[] = [];
  const reader = createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
    store,
    { onBatchReadPhaseStats: (record) => summaries.push(record) },
  );
  await assert.rejects(
    () => reader.readJobEvidenceBatch!([plan.identity.jobId]),
    /naver_news_mirror_job_payload_invalid/,
  );
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.outcome, 'rejected');
});

test('explicit 12-worker canonical read experiment retains every immutable job and never exceeds its cap', async () => {
  const store = new MemoryImmutableStore();
  const plans = Array.from({ length: 29 }, (_, index) =>
    planAt(new Date(
      Date.parse('2026-10-03T01:00:00.000Z') + index * 60 * 60_000,
    ).toISOString()),
  );
  for (const plan of plans) await mirrorNaverNewsStoredEvidence(plan, store);

  let active = 0;
  let peak = 0;
  const meteredStore = {
    async readText(pathname: string): Promise<string | null> {
      active += 1;
      peak = Math.max(active, peak);
      try {
        await new Promise<void>((resolve) => setTimeout(resolve, 3));
        return await store.readText(pathname);
      } finally {
        active -= 1;
      }
    },
  };
  const reader = createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
    meteredStore,
    { maxConcurrentReads: EXPERIMENTAL_MAX_CONCURRENT_MIRROR_EVIDENCE_READS },
  );
  const batch = reader.readJobEvidenceBatch;
  assert.ok(batch);
  const observed = await batch([
    ...plans.map((plan) => plan.identity.jobId),
    plans[0]!.identity.jobId,
  ]);
  assert.equal(observed.size, plans.length);
  assert.deepEqual(
    [...observed.keys()],
    plans.map((plan) => plan.identity.jobId),
  );
  assert.ok(peak > 8);
  assert.ok(peak <= EXPERIMENTAL_MAX_CONCURRENT_MIRROR_EVIDENCE_READS);
  assert.equal(active, 0);
});

test('experimental 12-worker canonical reader still fails closed on corrupted later evidence', async () => {
  const store = new MemoryImmutableStore();
  const plans = Array.from({ length: 28 }, (_, index) =>
    planAt(new Date(
      Date.parse('2026-10-03T01:00:00.000Z') + index * 60 * 60_000,
    ).toISOString()),
  );
  for (const plan of plans) await mirrorNaverNewsStoredEvidence(plan, store);
  const corrupt = buildNaverNewsStoredEvidenceMirrorObjects(plans[24]!);
  const tampered = JSON.parse(corrupt.jobBody);
  tampered.storedEvidence.normalizedRecords[0].title = 'tampered';
  store.values.set(corrupt.jobPathname, JSON.stringify(tampered));
  const reader = createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
    store,
    { maxConcurrentReads: EXPERIMENTAL_MAX_CONCURRENT_MIRROR_EVIDENCE_READS },
  );
  assert.ok(reader.readJobEvidenceBatch);
  await assert.rejects(
    () => reader.readJobEvidenceBatch!(plans.map((plan) => plan.identity.jobId)),
    /naver_news_mirror_job_payload_invalid/,
  );
});
