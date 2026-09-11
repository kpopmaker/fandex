import assert from 'node:assert/strict';
import test from 'node:test';

import type { LastfmRealSignalSourceBundle } from '../lib/lastfm-signal/contracts';
import { parseCsvRows } from '../lib/lastfm-signal/csv';
import { buildLastfmRealSignalReadModel } from '../lib/lastfm-signal/readModel';

const historyCsv = `snapshotDate,artist,query,lastfmName,listeners,playcount,collectedAt,status
2026-08-29,Artist A,Artist A,Artist A,1000,10000,2026-08-29T09:17:00+09:00,ok
2026-08-29,Artist B,Artist B,Artist B,2000,20000,2026-08-29T09:17:00+09:00,ok
2026-08-30,Artist A,Artist A,Artist A,1010,10100,2026-08-30T09:17:00+09:00,ok
2026-08-30,Artist B,Artist B,Artist B,2020,20300,2026-08-30T09:17:00+09:00,ok
`;

const deltaCsv = `artist,previousDate,latestDate,daysBetween,listenerDelta,playcountDelta,listenerDeltaPerDay,playcountDeltaPerDay,status
Artist A,2026-08-29,2026-08-30,1,10,100,10.0,100.0,delta_ready
Artist B,2026-08-29,2026-08-30,1,20,300,20.0,300.0,delta_ready
`;

const scoreCsv = `rank,artist,previousDate,latestDate,daysBetween,listenerDeltaPerDay,playcountDeltaPerDay,listenerLogNormalized,playcountLogNormalized,lastfmGlobalInterestPreviewPoint,status
1,Artist B,2026-08-29,2026-08-30,1,20.0,300.0,100.0,100.0,100.0,preview_ready
2,Artist A,2026-08-29,2026-08-30,1,10.0,100.0,0.0,0.0,0.0,preview_ready
`;

const status = {
  version: 'lastfm_cloud_history_v1',
  createdAt: '2026-08-30T09:17:05+09:00',
  snapshotDate: '2026-08-30',
  snapshotAppended: true,
  historyRowCount: 4,
  snapshotDateCount: 2,
  deltaReadyCount: 2,
  needsReviewCount: 0,
  scorePreviewCount: 2,
  scoreUsage: 'preview_only_not_master_score',
  masterModified: false,
  websiteModified: false,
};

function bundle(overrides: Partial<LastfmRealSignalSourceBundle> = {}): LastfmRealSignalSourceBundle {
  return {
    historyCsv,
    deltaCsv,
    scoreCsv,
    statusJson: JSON.stringify(status),
    ...overrides,
  };
}

test('v131 read model turns tracked Last.fm files into a deterministic read-only signal snapshot', () => {
  const first = buildLastfmRealSignalReadModel(bundle());
  const second = buildLastfmRealSignalReadModel(bundle());

  assert.equal(first.contractVersion, 'v131_lastfm_real_signal_read_model_v1');
  assert.equal(first.sourceVersion, 'lastfm_cloud_history_v1');
  assert.equal(first.sourceUsage, 'preview_only_not_master_score');
  assert.equal(first.snapshotDate, '2026-08-30');
  assert.equal(first.readiness.state, 'ready');
  assert.deepEqual(first.readiness.reasons, []);
  assert.equal(first.readiness.signalCount, 2);
  assert.equal(first.digest, second.digest);
  assert.equal(first.digest.length, 64);
  assert.deepEqual(first.effects, {
    externalCalls: 0,
    databaseReads: 0,
    databaseWrites: 0,
    masterScoreWrites: 0,
    websiteWrites: 0,
  });

  assert.deepEqual(first.signals.map((item) => item.artistLabel), ['Artist B', 'Artist A']);
  assert.equal(first.signals[0].listeners, 2020);
  assert.equal(first.signals[0].playcount, 20300);
  assert.equal(first.signals[0].listenerDelta, 20);
  assert.equal(first.signals[0].playcountDelta, 300);
  assert.equal(first.signals[0].previewPoint, 100);
});

test('status safety boundary rejects any source snapshot that claims master or website modification', () => {
  assert.throws(
    () => buildLastfmRealSignalReadModel(bundle({
      statusJson: JSON.stringify({ ...status, masterModified: true }),
    })),
    /master_score_must_remain_unmodified/,
  );
  assert.throws(
    () => buildLastfmRealSignalReadModel(bundle({
      statusJson: JSON.stringify({ ...status, websiteModified: true }),
    })),
    /website_must_remain_unmodified/,
  );
});

test('metadata count mismatches block readiness without inventing or dropping source rows', () => {
  const model = buildLastfmRealSignalReadModel(bundle({
    statusJson: JSON.stringify({ ...status, historyRowCount: 5 }),
  }));
  assert.equal(model.readiness.state, 'blocked');
  assert.ok(model.readiness.reasons.includes('history-row-count-mismatch'));
  assert.equal(model.signals.length, 2);
});

test('score and delta files must agree exactly on dates and per-day observations', () => {
  const mismatchedScore = scoreCsv.replace('20.0,300.0,100.0', '21.0,300.0,100.0');
  assert.throws(
    () => buildLastfmRealSignalReadModel(bundle({ scoreCsv: mismatchedScore })),
    /score_delta_mismatch_Artist B/,
  );
});

test('CSV parser handles UTF-8 BOM, commas, escaped quotes, and CRLF without lossy splitting', () => {
  const rows = parseCsvRows('\uFEFFartist,note\r\n"A, B","said ""hello"""\r\n');
  assert.deepEqual(rows, [{ artist: 'A, B', note: 'said "hello"' }]);
});
