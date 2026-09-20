import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('committed v150 current-real audit preserves no-history-write boundary', async () => {
  const audit = JSON.parse(await readFile(
    new URL('../data/momentum-research/iu_current_real_v150_20260920T140000Z.json', import.meta.url),
    'utf8',
  ));
  const history = (await readFile(
    new URL('../data/momentum-research/iu_cross_family_evidence_state_v147.jsonl', import.meta.url),
    'utf8',
  )).trim().split(/\r?\n/).filter(Boolean);

  assert.equal(audit.contractVersion, 'v150_fandex_momentum_current_real_cutoff_gate_audit_v1');
  assert.equal(audit.v150.state, 'source-advanced-cutoff-unchanged');
  assert.equal(audit.currentEvidence.lastfmEvidenceId, audit.previousEvaluation.lastfmEvidenceId);
  assert.equal(audit.v150.lastfmEvidenceAdvanced, false);
  assert.equal(audit.v150.naverEvidenceAdvanced, true);
  assert.equal(audit.v150.commonCutoffAdvanced, false);
  assert.equal(audit.v150.commonCutoffUnchanged, true);
  assert.equal(audit.v150.historyObservationEligible, false);
  assert.equal(audit.v150.invokeV148Allowed, false);
  assert.equal(audit.v150.expectedV148Disposition, 'not-invoked');
  assert.equal(audit.history.recordCountBefore, 2);
  assert.equal(audit.history.recordCountAfter, 2);
  assert.equal(audit.history.artifactAppendCount, 0);
  assert.equal(history.length, 2);

  assert.equal(audit.effects.productMetricReads, 0);
  assert.equal(audit.effects.productMetricWrites, 0);
  assert.equal(audit.effects.previewFallbackReads, 0);
  assert.equal(audit.effects.databaseWrites, 0);
  assert.equal(audit.effects.historyWrites, 0);

  assert.equal(audit.currentEvidence.naverStatus, 'succeeded');
  assert.equal(audit.currentEvidence.naverRawEvidenceCount, 100);
  assert.equal(audit.currentEvidence.naverNormalizedRecordCount, 100);
  assert.equal(audit.currentEvidence.naverDuplicateRecordCount, 0);
  assert.equal(audit.currentEvidence.naverRejectedItemCount, 0);
});
