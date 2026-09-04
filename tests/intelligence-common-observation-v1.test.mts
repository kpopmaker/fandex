import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  FANDEX_OBSERVATION_CONTRACT_VERSION,
  type FandexObservationDraft,
} from '../lib/intelligence/observationContracts';
import {
  createFandexDataLifecycle,
  mapFandexDataLifecycle,
  type FandexDataLifecycleState,
} from '../lib/intelligence/productionState';
import { projectNaverNewsNormalizedRecord } from '../lib/server/intelligence/naverNewsObservationAdapter';
import { createFandexObservation } from '../lib/server/intelligence/fandexObservationFactory';
import type { NaverNewsNormalizedRecord } from '../lib/server/ingestion/naverNewsContracts';

const COMMON_MAPPING = Object.freeze({
  research: 'research',
  shadow: 'shadow',
  ready: 'production-candidate',
  blocked: 'blocked',
} satisfies Readonly<Record<string, FandexDataLifecycleState>>);

function lifecycle(state: FandexDataLifecycleState = 'research') {
  return createFandexDataLifecycle({ state, materialClass: 'real', blockers: [] });
}

function draft(overrides: Partial<FandexObservationDraft> = {}): FandexObservationDraft {
  return {
    providerId: 'provider-a',
    entity: {
      entityType: 'artist',
      entityId: 'fandex-artist-a',
      providerEntityId: 'provider-artist-a',
      identityState: 'resolved',
    },
    variable: { variableId: 'listeners', metricFamily: 'music', role: 'raw-signal' },
    value: { rawValue: 10, unit: 'listeners', missingState: 'observed' },
    time: {
      providerPeriodStart: '2026-08-01',
      providerPeriodEnd: '2026-08-31',
      observedAt: '2026-09-01T00:00:00.000Z',
      collectedAt: '2026-09-01T00:05:00.000Z',
    },
    evidence: { evidenceRef: 'evidence-a', revision: null, conflictState: null },
    lifecycle: lifecycle(),
    contractVersion: FANDEX_OBSERVATION_CONTRACT_VERSION,
    ...overrides,
  };
}

test('common lifecycle states remain explicit and never auto-promote', () => {
  assert.equal(mapFandexDataLifecycle({ sourceState: 'research', materialClass: 'real', mapping: COMMON_MAPPING }).state, 'research');
  assert.equal(mapFandexDataLifecycle({ sourceState: 'shadow', materialClass: 'real', mapping: COMMON_MAPPING }).state, 'shadow');
  assert.equal(mapFandexDataLifecycle({ sourceState: 'ready', materialClass: 'real', mapping: COMMON_MAPPING }).state, 'production-candidate');
  assert.equal(mapFandexDataLifecycle({ sourceState: 'blocked', materialClass: 'real', mapping: COMMON_MAPPING }).state, 'blocked');
});

test('non-real material cannot be constructed as production', () => {
  for (const materialClass of ['synthetic', 'fixture', 'preview'] as const) {
    assert.throws(
      () => createFandexDataLifecycle({ state: 'production', materialClass }),
      /fandex_production_material_class_invalid/,
    );
  }
});

test('malformed, unknown, and invalid source mappings fail closed deterministically', () => {
  const malformed = mapFandexDataLifecycle({ sourceState: null, materialClass: 'real', mapping: COMMON_MAPPING });
  const unknown = mapFandexDataLifecycle({ sourceState: 'eligible', materialClass: 'real', mapping: COMMON_MAPPING });
  const invalid = mapFandexDataLifecycle({
    sourceState: 'bad',
    materialClass: 'real',
    mapping: { bad: 'active' as FandexDataLifecycleState },
  });
  assert.deepEqual([malformed.state, unknown.state, invalid.state], ['blocked', 'blocked', 'blocked']);
  assert.deepEqual(malformed.blockers, ['source-state-malformed']);
  assert.deepEqual(unknown.blockers, ['source-state-unmapped']);
  assert.deepEqual(invalid.blockers, ['lifecycle-mapping-invalid']);
});

test('research, shadow, candidate, readiness, eligible, and blocked cannot map to production', () => {
  for (const sourceState of [
    'research', 'shadow', 'production-candidate', 'ready', 'readiness',
    'readiness-candidate', 'eligible', 'blocked',
  ]) {
    const projected = mapFandexDataLifecycle({
      sourceState,
      materialClass: 'real',
      mapping: { [sourceState]: 'production' },
    });
    assert.equal(projected.state, 'blocked');
    assert.deepEqual(projected.blockers, ['production-authorization-not-established']);
  }
});

test('common research, shadow, candidate, and blocked mappings cannot become a more advanced state', () => {
  const cases = [
    ['research', 'shadow'],
    ['research', 'production-candidate'],
    ['shadow', 'production-candidate'],
    ['blocked', 'research'],
  ] as const;
  for (const [sourceState, targetState] of cases) {
    const projected = mapFandexDataLifecycle({
      sourceState,
      materialClass: 'real',
      mapping: { [sourceState]: targetState },
    });
    assert.equal(projected.state, 'blocked');
    assert.deepEqual(projected.blockers, ['source-state-promotion-invalid']);
  }
});

test('lifecycle blocker output is immutable, unique, and ordered', () => {
  const value = createFandexDataLifecycle({
    state: 'research',
    materialClass: 'real',
    blockers: ['z-blocker', 'a-blocker', 'z-blocker'],
  });
  assert.deepEqual(value.blockers, ['a-blocker', 'z-blocker']);
  assert.ok(Object.isFrozen(value));
  assert.ok(Object.isFrozen(value.blockers));
});

test('valid observation preserves separate identities, times, evidence, and conflict metadata', () => {
  const observation = createFandexObservation(draft({
    evidence: { evidenceRef: 'evidence-a', revision: 'r1', conflictState: 'conflicting' },
  }));
  assert.notEqual(observation.entity.entityId, observation.entity.providerEntityId);
  assert.notEqual(observation.time.providerPeriodStart, observation.time.collectedAt);
  assert.equal(observation.evidence.evidenceRef, 'evidence-a');
  assert.equal(observation.evidence.conflictState, 'conflicting');
  assert.ok(Object.isFrozen(observation));
  assert.ok(Object.isFrozen(observation.entity));
});

test('missing is distinct from observed zero and blocked missing is preserved', () => {
  const missing = createFandexObservation(draft({
    value: { rawValue: null, unit: 'listeners', missingState: 'missing' },
  }));
  const zero = createFandexObservation(draft({
    value: { rawValue: 0, normalizedValue: null, unit: 'listeners', missingState: 'observed' },
  }));
  const blocked = createFandexObservation(draft({
    value: { rawValue: null, unit: null, missingState: 'blocked' },
  }));
  assert.equal(missing.value.rawValue, null);
  assert.equal(zero.value.rawValue, 0);
  assert.equal(zero.value.missingState, 'observed');
  assert.equal(zero.value.normalizedValue, null);
  assert.equal(blocked.value.missingState, 'blocked');
});

test('normalized value is never populated from raw value', () => {
  const observation = createFandexObservation(draft());
  assert.equal(Object.prototype.hasOwnProperty.call(observation.value, 'normalizedValue'), false);
});

test('observation validation rejects malformed required fields and contradictory payloads', () => {
  assert.throws(() => createFandexObservation(draft({ providerId: ' ' })), /provider_id_invalid/);
  assert.throws(() => createFandexObservation(draft({ variable: { variableId: '', metricFamily: 'music' } })), /variable_id_invalid/);
  assert.throws(() => createFandexObservation(draft({ evidence: { evidenceRef: '' } })), /evidence_ref_invalid/);
  assert.throws(() => createFandexObservation(draft({ time: { collectedAt: 'not-a-date' } })), /collected_at_invalid/);
  assert.throws(() => createFandexObservation(draft({ value: { rawValue: null, unit: null, missingState: 'observed' } })), /observed_value_required/);
  assert.throws(() => createFandexObservation(draft({ value: { rawValue: 0, unit: null, missingState: 'missing' } })), /missing_value_must_be_null/);
  assert.throws(() => createFandexObservation(draft({ value: { rawValue: null, unit: null, missingState: 'unknown' as never } })), /missing_state_invalid/);
  assert.throws(() => createFandexObservation(draft({ entity: { entityType: 'artist', entityId: null, identityState: '' } })), /identity_state_invalid/);
});

test('observation validation rejects invalid lifecycle and production material combinations', () => {
  assert.throws(() => createFandexObservation(draft({ lifecycle: { state: 'active' as never, materialClass: 'real', blockers: [] } })), /lifecycle_state_invalid/);
  assert.throws(() => createFandexObservation(draft({ lifecycle: { state: 'research', materialClass: 'unknown' as never, blockers: [] } })), /material_class_invalid/);
  for (const materialClass of ['synthetic', 'fixture', 'preview'] as const) {
    assert.throws(
      () => createFandexObservation(draft({ lifecycle: { state: 'production', materialClass, blockers: [] } })),
      /production_material_class_invalid/,
    );
  }
});

test('observation identity is key-order independent and revision/evidence aware', () => {
  const first = createFandexObservation(draft());
  const reordered = createFandexObservation({
    contractVersion: FANDEX_OBSERVATION_CONTRACT_VERSION,
    lifecycle: lifecycle(),
    evidence: { conflictState: null, revision: null, evidenceRef: 'evidence-a' },
    time: {
      collectedAt: '2026-09-01T00:05:00.000Z',
      observedAt: '2026-09-01T00:00:00.000Z',
      providerPeriodEnd: '2026-08-31',
      providerPeriodStart: '2026-08-01',
    },
    value: { missingState: 'observed', unit: 'listeners', rawValue: 999 },
    variable: { role: 'raw-signal', metricFamily: 'music', variableId: 'listeners' },
    entity: {
      identityState: 'resolved',
      providerEntityId: 'provider-artist-a',
      entityId: 'fandex-artist-a',
      entityType: 'artist',
    },
    providerId: 'provider-a',
  });
  const revision = createFandexObservation(draft({ evidence: { evidenceRef: 'evidence-a', revision: 'r2' } }));
  const evidence = createFandexObservation(draft({ evidence: { evidenceRef: 'evidence-b', revision: null } }));
  assert.equal(first.observationId, reordered.observationId);
  assert.notEqual(first.observationId, revision.observationId);
  assert.notEqual(first.observationId, evidence.observationId);
});

const naverRecord: NaverNewsNormalizedRecord = Object.freeze({
  recordId: 'record-1',
  rawEvidenceId: 'evidence-1',
  provider: 'naver-news',
  sourceType: 'news_article',
  sourceUrl: 'https://example.com/article',
  naverUrl: 'https://n.news.naver.com/article/001/1',
  sourceHost: 'example.com',
  title: 'Normalized article title',
  summary: 'Normalized article summary',
  publishedAt: '2026-08-31T01:00:00.000Z',
  collectedAt: '2026-08-31T02:00:00.000Z',
  contentSha256: 'a'.repeat(64),
  recordSha256: 'b'.repeat(64),
  normalizedPayload: Object.freeze({
    provider: 'naver-news',
    sourceType: 'news_article',
    sourceUrl: 'https://example.com/article',
    naverUrl: 'https://n.news.naver.com/article/001/1',
    sourceHost: 'example.com',
    title: 'Normalized article title',
    summary: 'Normalized article summary',
    publishedAt: '2026-08-31T01:00:00.000Z',
  }),
});

test('NAVER normalized record projects without scoring or production promotion', () => {
  const observation = projectNaverNewsNormalizedRecord(naverRecord);
  assert.equal(observation.providerId, 'naver-news');
  assert.equal(observation.entity.entityId, null);
  assert.equal(observation.entity.providerEntityId, 'record-1');
  assert.equal(observation.value.rawValue, true);
  assert.equal(observation.value.missingState, 'observed');
  assert.equal(observation.time.providerPeriodStart, naverRecord.publishedAt);
  assert.equal(observation.time.collectedAt, naverRecord.collectedAt);
  assert.equal(observation.evidence.evidenceRef, naverRecord.rawEvidenceId);
  assert.equal(observation.evidence.revision, naverRecord.recordSha256);
  assert.equal(observation.lifecycle.state, 'research');
  assert.equal(observation.lifecycle.materialClass, 'real');
  assert.equal('score' in observation, false);
  assert.equal('weight' in observation, false);
});

test('NAVER adapter has a pure type-only subsystem boundary and no I/O imports', async () => {
  const [source, contractSource] = await Promise.all([
    readFile(new URL('../lib/server/intelligence/naverNewsObservationAdapter.ts', import.meta.url), 'utf8'),
    readFile(new URL('../lib/intelligence/observationContracts.ts', import.meta.url), 'utf8'),
  ]);
  assert.doesNotMatch(source, /naverNewsRepository|naverNewsWorker|naverNewsExternalCollector/);
  assert.doesNotMatch(source, /process\.env|fetch\s*\(|credential|database/i);
  assert.match(source, /import type \{ NaverNewsNormalizedRecord \}/);
  assert.doesNotMatch(contractSource, /node:crypto|canonicalDigest/);
});
