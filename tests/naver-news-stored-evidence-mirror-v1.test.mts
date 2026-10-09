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
  MAX_CONCURRENT_MIRROR_CANONICAL_READS,
  MAX_CONCURRENT_MIRROR_EVIDENCE_READS,
  buildNaverNewsStoredEvidenceMirrorObjects,
  createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository,
  createObjectStoreNaverNewsLatestOfficialShadowSlotRepository,
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

test('manifest read phase summarizes complete verified evidence without leaking identities', async () => {
  const store = new MemoryImmutableStore();
  const plans = [
    planAt('2026-10-03T01:00:00.000Z'),
    planAt('2026-10-03T02:00:00.000Z'),
  ];
  for (const plan of plans) await mirrorNaverNewsStoredEvidence(plan, store);

  const records: Record<string, unknown>[] = [];
  const reader = createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
    store,
    { onManifestReadPhaseStats: (record) => records.push(record) },
  );
  const jobs = await reader.readSucceededSchedulerJobs();
  assert.equal(jobs.length, plans.length);
  assert.equal(records.length, 1);
  const summary = records[0]!;
  assert.equal(summary.contractVersion, 'naver-news-mirror-manifest-read-phase-v1');
  assert.equal(summary.outcome, 'fulfilled');
  assert.equal(summary.manifestsRequested, 2);
  assert.equal(summary.manifestsFound, 2);
  assert.equal(summary.manifestsMissing, 0);
  assert.deepEqual(Object.keys(summary).sort(), [
    'contractVersion', 'outcome', 'manifestsRequested', 'manifestsFound',
    'manifestsMissing', 'listWallMs', 'remoteReadSumMs', 'remoteReadMaxMs',
    'decodeSumMs', 'decodeMaxMs', 'wallMs',
  ].sort());
  for (const key of [
    'listWallMs', 'remoteReadSumMs', 'remoteReadMaxMs',
    'decodeSumMs', 'decodeMaxMs', 'wallMs',
  ]) {
    assert.ok(Number.isInteger(summary[key]) && (summary[key] as number) >= 0);
  }
  const serialized = JSON.stringify(summary);
  assert.ok(plans.every((plan) => !serialized.includes(plan.identity.jobId)));
  assert.doesNotMatch(serialized, /stored-evidence-mirror\/v1\/|news\.example|아이유/);
});

test('manifest phase failure remains fail closed for missing or corrupt immutable objects', async () => {
  const store = new MemoryImmutableStore();
  const plan = planAt('2026-10-03T03:00:00.000Z');
  await mirrorNaverNewsStoredEvidence(plan, store);

  const records: { outcome: string; manifestsMissing: number }[] = [];
  const missingStore = {
    listPathnames: (prefix: string) => store.listPathnames(prefix),
    async readText(pathname: string): Promise<string | null> {
      if (pathname.includes('/scheduler-manifests/')) return null;
      return store.readText(pathname);
    },
  };
  const missingReader = createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
    missingStore,
    { onManifestReadPhaseStats: (record) => records.push(record) },
  );
  await assert.rejects(
    () => missingReader.readSucceededSchedulerJobs(),
    /naver_news_latest_official_slot_stored_job_invalid/,
  );
  assert.equal(records.length, 1);
  assert.equal(records[0]?.outcome, 'rejected');
  assert.equal(records[0]?.manifestsMissing, 1);

  const objects = buildNaverNewsStoredEvidenceMirrorObjects(plan);
  assert.ok(objects.schedulerManifestPathname);
  const tampered = JSON.parse(objects.schedulerManifestBody!);
  tampered.jobPayloadDigest = 'f'.repeat(64);
  store.values.set(objects.schedulerManifestPathname!, JSON.stringify(tampered));
  const corrupted = createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
    store,
    { onManifestReadPhaseStats() { throw new Error('ignored-observer-error'); } },
  );
  await assert.rejects(
    () => corrupted.readSucceededSchedulerJobs(),
    /naver_news_latest_official_slot_stored_job_invalid/,
  );
});

test('throwing manifest observer cannot override a successful verified read', async () => {
  const store = new MemoryImmutableStore();
  const plan = planAt('2026-10-03T04:00:00.000Z');
  await mirrorNaverNewsStoredEvidence(plan, store);
  const reader = createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
    store,
    { onManifestReadPhaseStats() { throw new Error('ignored-observer-error'); } },
  );
  assert.equal((await reader.readSucceededSchedulerJobs()).length, 1);
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
  const defaultCapSummaries: Array<{
    configuredMaxConcurrentReads: number;
    peakConcurrentRemoteReads: number;
  }> = [];
  const canonical =
    createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
      meteredStore,
      { onBatchReadPhaseStats: (summary) => defaultCapSummaries.push(summary) },
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
  assert.ok(peak <= MAX_CONCURRENT_MIRROR_EVIDENCE_READS);
  assert.equal(active, 0);
  assert.equal(defaultCapSummaries.length, 1);
  assert.equal(defaultCapSummaries[0]?.configuredMaxConcurrentReads, 8);
  assert.equal(defaultCapSummaries[0]?.peakConcurrentRemoteReads, peak);
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
  assert.ok(peak <= MAX_CONCURRENT_MIRROR_EVIDENCE_READS);
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
  assert.equal(record.configuredMaxConcurrentReads, 8);
  assert.ok(typeof record.peakConcurrentRemoteReads === 'number');
  assert.ok((record.peakConcurrentRemoteReads as number) >= 1);
  assert.ok((record.peakConcurrentRemoteReads as number) <= 8);
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

test('explicit canonical twelve-worker option verifies every job and never schedules beyond twelve', async () => {
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
      peak = Math.max(peak, active);
      try {
        await new Promise<void>((resolve) => setTimeout(resolve, 3));
        return await store.readText(pathname);
      } finally {
        active -= 1;
      }
    },
  };
  const summaries: Array<{
    objectsRequested: number;
    objectsFound: number;
    objectsMissing: number;
    configuredMaxConcurrentReads: number;
    peakConcurrentRemoteReads: number;
  }> = [];
  const reader = createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
    meteredStore,
    {
      maxConcurrentReads: MAX_CONCURRENT_MIRROR_CANONICAL_READS,
      onBatchReadPhaseStats: (summary) => summaries.push(summary),
    },
  );
  assert.ok(reader.readJobEvidenceBatch);
  const jobs = await reader.readJobEvidenceBatch!([
    ...plans.map((plan) => plan.identity.jobId),
    plans[0]!.identity.jobId,
  ]);
  assert.deepEqual([...jobs.keys()], plans.map((plan) => plan.identity.jobId));
  assert.equal(jobs.size, plans.length);
  assert.ok(peak > MAX_CONCURRENT_MIRROR_EVIDENCE_READS);
  assert.ok(peak <= MAX_CONCURRENT_MIRROR_CANONICAL_READS);
  assert.equal(active, 0);
  assert.equal(summaries.length, 1);
  assert.equal(summaries[0]?.objectsRequested, 29);
  assert.equal(summaries[0]?.objectsFound, 29);
  assert.equal(summaries[0]?.objectsMissing, 0);
  assert.equal(summaries[0]?.configuredMaxConcurrentReads, 12);
  assert.equal(summaries[0]?.peakConcurrentRemoteReads, peak);
});

test('opted-in twelve-worker canonical read remains fail-closed for later tampering', async () => {
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
  const outcomes: Array<{
    outcome: string;
    configuredMaxConcurrentReads: number;
    peakConcurrentRemoteReads: number;
  }> = [];
  const reader = createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
    store,
    {
      maxConcurrentReads: MAX_CONCURRENT_MIRROR_CANONICAL_READS,
      onBatchReadPhaseStats(record) { outcomes.push(record); },
    },
  );
  assert.ok(reader.readJobEvidenceBatch);
  await assert.rejects(
    () => reader.readJobEvidenceBatch!(plans.map((plan) => plan.identity.jobId)),
    /naver_news_mirror_job_payload_invalid/,
  );
  assert.equal(outcomes.length, 1);
  assert.equal(outcomes[0]?.outcome, 'rejected');
  assert.equal(outcomes[0]?.configuredMaxConcurrentReads, 12);
  assert.ok((outcomes[0]?.peakConcurrentRemoteReads ?? 0) <= 12);
});
