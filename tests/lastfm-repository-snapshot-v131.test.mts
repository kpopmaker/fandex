import assert from 'node:assert/strict';
import test from 'node:test';

import { readLastfmRealSignalReadModel } from '../lib/lastfm-signal/repositorySnapshot';

test('tracked Last.fm cloud files resolve to a ready shadow read model', async () => {
  const model = await readLastfmRealSignalReadModel();

  assert.equal(model.contractVersion, 'v131_lastfm_real_signal_read_model_v1');
  assert.equal(model.sourceVersion, 'lastfm_cloud_history_v1');
  assert.equal(model.sourceUsage, 'preview_only_not_master_score');
  assert.equal(model.readiness.state, 'ready');
  assert.equal(model.readiness.reasons.length, 0);
  assert.equal(model.readiness.needsReviewCount, 0);
  assert.ok(model.readiness.signalCount > 0);
  assert.equal(model.signals.length, model.readiness.signalCount);
  assert.ok(model.signals.every((signal) => signal.latestDate === model.snapshotDate));
  assert.ok(model.signals.every((signal) => signal.listeners > 0));
  assert.ok(model.signals.every((signal) => signal.playcount > 0));
  assert.ok(model.signals.every((signal) => signal.previewPoint >= 0 && signal.previewPoint <= 100));
  assert.equal(new Set(model.signals.map((signal) => signal.artistLabel)).size, model.signals.length);
  assert.deepEqual(model.effects, {
    externalCalls: 0,
    databaseReads: 0,
    databaseWrites: 0,
    masterScoreWrites: 0,
    websiteWrites: 0,
  });
});
