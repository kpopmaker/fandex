import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MAX_CONCURRENT_MIRROR_EVIDENCE_READS,
  MAX_CONCURRENT_MIRROR_CANONICAL_READS,
  mapMirroredEvidenceBatched,
} from '../lib/server/ingestion/naverNewsStoredEvidenceMirror';

test('NAVER mirror reader refills a free slot without waiting for the slowest of eight', async () => {
  assert.equal(MAX_CONCURRENT_MIRROR_EVIDENCE_READS, 8);

  let releaseFirst!: () => void;
  const first = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  let running = 0;
  let peak = 0;
  const started: number[] = [];

  const job = mapMirroredEvidenceBatched(
    Array.from({ length: 12 }, (_, index) => index),
    async (index) => {
      running++;
      peak = Math.max(peak, running);
      started.push(index);
      try {
        if (index === 0) await first;
        return `immutable-job-${index}`;
      } finally {
        running--;
      }
    },
  );

  try {
    for (let attempt = 0; attempt < 8; attempt++) {
      await Promise.resolve();
    }

    assert.equal(started[0], 0);
    assert.ok(started.includes(8),
      'job nine starts before the deliberately stalled first job completes');
    assert.ok(peak <= MAX_CONCURRENT_MIRROR_EVIDENCE_READS);
  } finally {
    releaseFirst();
  }

  assert.deepEqual(
    await job,
    Array.from({ length: 12 }, (_, index) => `immutable-job-${index}`),
  );
  assert.equal(running, 0);
});

test('NAVER bounded reader retains exact ordering, missing null entries and empty input', async () => {
  const readOrder: number[] = [];
  const output = await mapMirroredEvidenceBatched(
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    async (value) => {
      readOrder.push(value);
      return value === 6 ? null : `canonical-${value}`;
    },
  );
  assert.deepEqual(output, [
    'canonical-0', 'canonical-1', 'canonical-2', 'canonical-3',
    'canonical-4', 'canonical-5', null, 'canonical-7',
    'canonical-8', 'canonical-9',
  ]);
  assert.deepEqual([...readOrder].sort((a, b) => a - b),
    Array.from({ length: 10 }, (_, index) => index));
  assert.deepEqual(await mapMirroredEvidenceBatched([], async () => 'unused'), []);
});

test('NAVER mirror reader fails closed when underlying Blob request rejects', async () => {
  const fail = new Error('private-blob-read-failed');
  await assert.rejects(
    mapMirroredEvidenceBatched(
      [0, 1, 2, 3, 4],
      async (index) => {
        if (index === 3) throw fail;
        return index;
      },
    ),
    (reason) => reason === fail,
  );
});

test('canonical twelve-worker mode bounds in-flight reads, refills and preserves exact ordering', async () => {
  assert.equal(MAX_CONCURRENT_MIRROR_EVIDENCE_READS, 8);
  assert.equal(MAX_CONCURRENT_MIRROR_CANONICAL_READS, 12);
  const started: number[] = [];
  let running = 0;
  let peak = 0;
  let releaseFirst!: () => void;
  const first = new Promise<void>((resolve) => { releaseFirst = resolve; });
  const pending = mapMirroredEvidenceBatched(
    Array.from({ length: 26 }, (_, index) => index),
    async (index) => {
      running += 1;
      peak = Math.max(peak, running);
      started.push(index);
      try {
        if (index === 0) await first;
        return index === 19 ? null : `verified-job-${index}`;
      } finally {
        running -= 1;
      }
    },
    MAX_CONCURRENT_MIRROR_CANONICAL_READS,
  );
  let refilledBeforeSlow = false;
  try {
    for (let i = 0; i < 60; i += 1) {
      await Promise.resolve();
      if (started.includes(12)) break;
    }
    refilledBeforeSlow = started.includes(12);
  } finally {
    releaseFirst();
  }

  const rows = await pending;
  assert.equal(refilledBeforeSlow, true);
  assert.equal(peak, 12);
  assert.equal(running, 0);
  assert.deepEqual(rows, Array.from({ length: 26 }, (_, index) =>
    index === 19 ? null : `verified-job-${index}`,
  ));
});

test('canonical twelve-worker mode fails closed and stops scheduling after the first read error', async () => {
  const failure = new Error('immutable-blob-unavailable');
  let started = 0;
  let active = 0;
  let releaseInFlight!: () => void;
  const held = new Promise<void>((resolve) => { releaseInFlight = resolve; });
  const pending = mapMirroredEvidenceBatched(
    Array.from({ length: 30 }, (_, index) => index),
    async (index) => {
      started += 1;
      active += 1;
      try {
        if (index === 2) throw failure;
        await held;
        return index;
      } finally {
        active -= 1;
      }
    },
    MAX_CONCURRENT_MIRROR_CANONICAL_READS,
  );
  try {
    for (let i = 0; i < 4; i += 1) await Promise.resolve();
  } finally {
    releaseInFlight();
  }
  await assert.rejects(pending, (error) => error === failure);
  assert.equal(active, 0);
  assert.equal(started, MAX_CONCURRENT_MIRROR_CANONICAL_READS);
});
