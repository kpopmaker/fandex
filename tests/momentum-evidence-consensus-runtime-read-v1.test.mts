import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  readMomentumEvidenceConsensusShadowProductFromJsonl,
  readMomentumEvidenceConsensusStoredEvidenceFromJsonl,
} from '../lib/server/ingestion/momentumEvidenceConsensusRepository';
import {
  getMomentumEvidenceConsensusShadowProductForIU,
  getMomentumEvidenceConsensusStoredEvidenceForIU,
} from '../lib/server/product/momentumEvidenceConsensusRealProductRead';

const ARTIFACT_URL = new URL(
  '../data/momentum-product/iu_momentum_evidence_consensus_v147.jsonl',
  import.meta.url,
);

const FIRST_RECORD_ID =
  'cfd672eafde59bf5a2e70788398688b08142b069a360ecb2b76f6c30007fcce1';
const LATEST_RECORD_ID =
  '6bf29ed2e15a4c374f9985279e5d60e44eab404371fd807b62adad1bebf6cadd';

test('real IU artifact produces shadow categorical Product truth without numeric fallback', async () => {
  const result = await getMomentumEvidenceConsensusShadowProductForIU();

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.model.identity.sourceArtistId, 'iu');
  assert.equal(
    result.model.identity.constructId,
    'momentumEvidenceConsensus',
  );
  assert.equal(result.model.publication, 'shadow');
  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.presentation, 'standard');
  assert.equal(result.model.previewFallbackUsed, false);
  assert.equal(result.model.productMetricReadPerformed, false);

  assert.deepEqual(result.model.evidence, {
    alignmentCutoffAt: '2026-09-20T01:59:13.000Z',
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    qualitativeDirectionEvidenceUsable: false,
    conflictState: 'detected',
  });

  assert.equal(
    result.model.storedEvidenceTrace.carrierRecordId,
    LATEST_RECORD_ID,
  );
  assert.equal(
    result.model.storedEvidenceTrace.observationId,
    'cede964d6e37f42272f44682b5b600b39f200a3c04028d9e5c60f00f31534b9c',
  );
  assert.equal(
    result.model.storedEvidenceTrace.sourceV143Digest,
    '87edf2884c2f35a3a5819349ebb374012926f103fdeb3d41af10da59ca68de7a',
  );
  assert.match(
    result.model.storedEvidenceTrace.observationDigest,
    /^[0-9a-f]{64}$/,
  );

  const serialized = JSON.stringify(result.model);
  assert.doesNotMatch(serialized, /"score"/);
  assert.doesNotMatch(serialized, /"weightedScore"/);
  assert.doesNotMatch(serialized, /"normalizedValue"/);
  assert.doesNotMatch(serialized, /"productMomentumScore"/);
});

test('exact Stored Evidence lookup preserves latest carrier lineage', async () => {
  const result = await getMomentumEvidenceConsensusStoredEvidenceForIU(
    LATEST_RECORD_ID,
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.deepEqual(
    {
      carrierRecordId: result.model.carrierRecordId,
      observationId: result.model.observationId,
      canonicalArtistId: result.model.canonicalArtistId,
      alignmentCutoffAt: result.model.alignmentCutoffAt,
      directionalConsensus: result.model.directionalConsensus,
      persistenceConsensus: result.model.persistenceConsensus,
      sourceV143Digest: result.model.sourceV143Digest,
      changeKind: result.model.changeKind,
      previousRecordDigest: result.model.previousRecordDigest,
      previousSourceV143Digest: result.model.previousSourceV143Digest,
    },
    {
      carrierRecordId: LATEST_RECORD_ID,
      observationId:
        'cede964d6e37f42272f44682b5b600b39f200a3c04028d9e5c60f00f31534b9c',
      canonicalArtistId: 'iu',
      alignmentCutoffAt: '2026-09-20T01:59:13.000Z',
      directionalConsensus: 'direction-conflicted',
      persistenceConsensus: 'persistence-not-applicable',
      sourceV143Digest:
        '87edf2884c2f35a3a5819349ebb374012926f103fdeb3d41af10da59ca68de7a',
      changeKind: 'direction-and-persistence-changed',
      previousRecordDigest: FIRST_RECORD_ID,
      previousSourceV143Digest:
        '121343630db936fa265f546523b28977614ce1658c13e68a7857344c4b3add28',
    },
  );
  assert.match(result.model.observationDigest, /^[0-9a-f]{64}$/);
});

test('historical first carrier record remains traceable and is not overwritten by latest state', async () => {
  const result = await getMomentumEvidenceConsensusStoredEvidenceForIU(
    FIRST_RECORD_ID,
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(
    result.model.directionalConsensus,
    'direction-corroborated-down',
  );
  assert.equal(
    result.model.persistenceConsensus,
    'one-direction-repeated',
  );
  assert.equal(result.model.changeKind, 'initial-observation');
  assert.equal(result.model.previousRecordDigest, null);
  assert.equal(result.model.previousSourceV143Digest, null);
});

test('unknown carrier id is not-found, not missing Product zero', async () => {
  const result = await getMomentumEvidenceConsensusStoredEvidenceForIU(
    'f'.repeat(64),
  );
  assert.deepEqual(result, { status: 'not-found' });
});

test('tampered hash-chain becomes data-issue and never falls back to Preview', async () => {
  const jsonl = await readFile(ARTIFACT_URL, 'utf8');
  const tampered = jsonl.replace(
    '"directionalConsensus":"direction-conflicted"',
    '"directionalConsensus":"flat-corroborated"',
  );

  const product = readMomentumEvidenceConsensusShadowProductFromJsonl({
    artistId: 'iu',
    jsonl: tampered,
  });
  assert.equal(product.status, 'data-issue');
  if (product.status === 'data-issue') {
    assert.equal(product.previewFallbackUsed, false);
    assert.equal(product.productMetricReadPerformed, false);
  }

  const stored = readMomentumEvidenceConsensusStoredEvidenceFromJsonl({
    artistId: 'iu',
    carrierRecordId: LATEST_RECORD_ID,
    jsonl: tampered,
  });
  assert.deepEqual(stored, {
    status: 'data-issue',
    reason: 'history-validation-failed',
  });
});

test('runtime repository has no database or legacy Product score dependency', async () => {
  const repositorySource = await readFile(
    new URL(
      '../lib/server/ingestion/momentumEvidenceConsensusRepository.ts',
      import.meta.url,
    ),
    'utf8',
  );
  const runtimeSource = await readFile(
    new URL(
      '../lib/server/product/momentumEvidenceConsensusRealProductRead.ts',
      import.meta.url,
    ),
    'utf8',
  );

  for (const source of [repositorySource, runtimeSource]) {
    assert.doesNotMatch(source, /metricScoringPipeline/);
    assert.doesNotMatch(source, /getResolvedMetricScore/);
    assert.doesNotMatch(source, /artistMonthlyMetricSeed/);
    assert.doesNotMatch(source, /getRuntimeDatabasePool/);
    assert.doesNotMatch(source, /\.query\(/);
  }
});

test('selected current-main artifact remains exact two-record real IU lineage', async () => {
  const jsonl = await readFile(ARTIFACT_URL, 'utf8');
  const lines = jsonl.split(/\r?\n/).filter((line) => line.trim().length > 0);

  assert.equal(lines.length, 2);
  assert.match(lines[0], new RegExp(FIRST_RECORD_ID));
  assert.match(lines[1], new RegExp(LATEST_RECORD_ID));
  assert.match(
    lines[1],
    /"directionalConsensus":"direction-conflicted"/,
  );
  assert.match(
    lines[1],
    /"persistenceConsensus":"persistence-not-applicable"/,
  );
});
