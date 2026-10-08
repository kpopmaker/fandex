import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createNaverNewsBlobReadStageTimer,
  NAVER_NEWS_BLOB_READ_STAGE_TIMING_VERSION,
} from '../lib/server/product/naverNewsBlobReadStageTiming';

const PREFIX = 'FANDEX_NAVER_NEWS_BLOB_READ_STAGE=';

test('disabled News stage timer preserves source values without logging', async () => {
  const logs: string[] = [];
  const timer = createNaverNewsBlobReadStageTimer({
    enabled: false,
    log: (line) => logs.push(line),
  });
  const sourceResult = Object.freeze({ evidence: 'raw-evidence-private' });
  const result = await timer.measure('manifest-load', () => sourceResult);

  assert.equal(result, sourceResult);
  assert.deepEqual(logs, []);
});

test('enabled timer logs only stage outcome and duration', async () => {
  const logs: string[] = [];
  let clock = 100;
  const timer = createNaverNewsBlobReadStageTimer({
    enabled: true,
    now: () => clock,
    log: (line) => logs.push(line),
  });
  const result = await timer.measure('canonical-evidence-batch', async () => {
    clock = 142.4;
    return 'evidence-content-must-not-leak';
  });

  assert.equal(result, 'evidence-content-must-not-leak');
  assert.equal(logs.length, 1);
  assert.ok(logs[0]!.startsWith(PREFIX));
  assert.deepEqual(JSON.parse(logs[0]!.slice(PREFIX.length)), {
    contractVersion: NAVER_NEWS_BLOB_READ_STAGE_TIMING_VERSION,
    stage: 'canonical-evidence-batch',
    outcome: 'fulfilled',
    durationMs: 42,
  });
  assert.doesNotMatch(logs[0]!, /evidence-content-must-not-leak/);
});

test('failed read preserves original error and never logs its payload', async () => {
  const logs: string[] = [];
  const secret = new Error('secret-provider-token-and-path');
  const timer = createNaverNewsBlobReadStageTimer({
    enabled: true,
    now: () => 11,
    log: (line) => logs.push(line),
  });
  await assert.rejects(
    timer.measure('latest-slot-resolution', async () => { throw secret; }),
    (error) => error === secret,
  );
  assert.equal(logs.length, 1);
  assert.deepEqual(JSON.parse(logs[0]!.slice(PREFIX.length)), {
    contractVersion: NAVER_NEWS_BLOB_READ_STAGE_TIMING_VERSION,
    stage: 'latest-slot-resolution',
    outcome: 'rejected',
    durationMs: 0,
  });
  assert.doesNotMatch(logs[0]!, /secret-provider-token-and-path/);
});

test('logging errors cannot replace successful or failed Product reads', async () => {
  const timer = createNaverNewsBlobReadStageTimer({
    enabled: true,
    log: () => { throw new Error('log sink failed'); },
  });
  assert.equal(
    await timer.measure('store-initialization', () => 123),
    123,
  );

  const failure = new Error('source originally failed');
  await assert.rejects(
    timer.measure('credential-resolution', () => { throw failure; }),
    (error) => error === failure,
  );
});

test('broken clock yields null duration without changing read result', async () => {
  const logs: string[] = [];
  const timer = createNaverNewsBlobReadStageTimer({
    enabled: true,
    now: () => Number.NaN,
    log: (line) => logs.push(line),
  });
  assert.equal(await timer.measure('methodology-evaluation', () => 0), 0);
  assert.equal(
    JSON.parse(logs[0]!.slice(PREFIX.length)).durationMs,
    null,
  );
});

test('nesting never logs sensitive callback args or source identifiers', async () => {
  const logs: string[] = [];
  const timer = createNaverNewsBlobReadStageTimer({
    enabled: true,
    now: () => 20,
    log: (line) => logs.push(line),
  });
  const result = await timer.measure('latest-slot-resolution', async () =>
    timer.measure('manifest-list', () => Object.freeze({
      pathname: 'private/store/job/secret-id',
    })),
  );
  assert.equal(result.pathname, 'private/store/job/secret-id');
  assert.deepEqual(
    logs.map((line) => JSON.parse(line.slice(PREFIX.length)).stage),
    ['manifest-list', 'latest-slot-resolution'],
  );
  assert.ok(logs.every((line) => !line.includes('private/store/job/secret-id')));
});
