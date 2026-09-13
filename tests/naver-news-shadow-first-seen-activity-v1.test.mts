import assert from 'node:assert/strict';
import test from 'node:test';

import { buildNaverNewsJobIdentity, sha256Canonical } from '../lib/server/ingestion/naverNewsContracts';
import { buildNaverNewsSchedulerPlan } from '../lib/server/ingestion/naverNewsScheduler';
import {
  evaluateNaverNewsShadowFirstSeenActivity,
  type NaverNewsShadowFirstSeenActivitySnapshot,
} from '../lib/server/ingestion/naverNewsShadowFirstSeenActivity';
import type { CanonicalNaverNewsObservation } from '../lib/server/ingestion/naverNewsCanonicalObservation';

const query = '아이유 IU';
const slot0 = '2026-09-14T00:00:00.000Z';
const slot1 = '2026-09-14T01:00:00.000Z';
const slot2 = '2026-09-14T02:00:00.000Z';

function plan(slotStart: string) {
  return buildNaverNewsSchedulerPlan({ query, at: slotStart, display: 100 });
}

function observation(
  idSeed: string,
  collectedAt: string,
  overrides: Partial<CanonicalNaverNewsObservation> = {},
): CanonicalNaverNewsObservation {
  const observationId = sha256Canonical({ observation: idSeed });
  const candidateId = sha256Canonical({ candidate: idSeed });
  const rawEvidenceId = sha256Canonical({ raw: idSeed, collectedAt });
  const recordId = sha256Canonical({ record: idSeed });
  return Object.freeze({
    observationId,
    candidateId,
    canonicalArtistId: 'iu',
    provider: 'naver-news',
    sourceType: 'news_article',
    canonicalSourceUrl: `https://example.com/${idSeed}`,
    observedAt: '2026-09-13T23:30:00.000Z',
    collectedAt,
    title: `아이유 ${idSeed}`,
    summary: '',
    sourceRecordIds: Object.freeze([recordId]),
    rawEvidenceIds: Object.freeze([rawEvidenceId]),
    relevanceVerification: Object.freeze({
      status: 'accepted' as const,
      reason: 'canonical_korean_alias_in_title' as const,
      matchedEvidence: Object.freeze({ field: 'title' as const, alias: '아이유' }),
    }),
    ...overrides,
  });
}

function snapshot(
  slotStart: string,
  observations: readonly CanonicalNaverNewsObservation[],
  overrides: Partial<NaverNewsShadowFirstSeenActivitySnapshot> = {},
): NaverNewsShadowFirstSeenActivitySnapshot {
  const schedulerPlan = plan(slotStart);
  const identity = buildNaverNewsJobIdentity(schedulerPlan.command);
  return Object.freeze({
    canonicalArtistId: 'iu',
    jobId: identity.jobId,
    slotStart,
    request: identity.request,
    completeness: Object.freeze({
      status: 'available' as const,
      readModel: Object.freeze({
        jobId: identity.jobId,
        provider: 'naver-news' as const,
        request: identity.request,
        providerTotal: 461_733,
        received: 100,
        completeness: Object.freeze({
          status: 'truncated' as const,
          reason: 'provider_total_exceeds_received' as const,
        }),
      }),
    }),
    observationSetCoverage: Object.freeze({
      status: 'proven' as const,
      reason: 'all_eligible_records_disposed' as const,
      canonicalArtistId: 'iu',
      jobId: identity.jobId,
      eligibleRecordCount: observations.length,
      coveredRecordCount: observations.length,
      missingRecordIds: Object.freeze([]),
      acceptedCandidateCount: observations.length,
      unknownCandidateCount: 0,
      rejectedCandidateCount: 0,
    }),
    observations: Object.freeze([...observations]),
    ...overrides,
  });
}

test('first slot is bootstrap and does not emit activity', () => {
  const result = evaluateNaverNewsShadowFirstSeenActivity({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    snapshots: [snapshot(slot0, [observation('a', '2026-09-14T00:05:00.000Z')])],
  });
  assert.equal(result.status, 'bootstrap');
  assert.equal(result.reason, 'bootstrap_only');
  assert.equal(result.slots[0].bootstrap, true);
  assert.equal(result.slots[0].firstSeenObservationCount, null);
  assert.deepEqual(result.slots[0].firstSeenObservationIds, []);
  assert.equal(result.directProductContributionEligible, false);
});

test('later slots count only never-before-seen accepted observations', () => {
  const a0 = observation('a', '2026-09-14T00:05:00.000Z');
  const a1 = observation('a', '2026-09-14T01:05:00.000Z', { observationId: a0.observationId });
  const b1 = observation('b', '2026-09-14T01:06:00.000Z');
  const b2 = observation('b', '2026-09-14T02:06:00.000Z', { observationId: b1.observationId });
  const c2 = observation('c', '2026-09-14T02:07:00.000Z');

  const result = evaluateNaverNewsShadowFirstSeenActivity({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    snapshots: [
      snapshot(slot0, [a0]),
      snapshot(slot1, [a1, b1]),
      snapshot(slot2, [b2, c2]),
    ],
  });

  assert.equal(result.status, 'available');
  assert.deepEqual(result.slots.map((slot) => slot.firstSeenObservationCount), [null, 1, 1]);
  assert.deepEqual(result.slots[1].firstSeenObservationIds, [b1.observationId]);
  assert.deepEqual(result.slots[2].firstSeenObservationIds, [c2.observationId]);
});

test('truncated collection is allowed for protocol-conditioned shadow activity', () => {
  const result = evaluateNaverNewsShadowFirstSeenActivity({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    snapshots: [
      snapshot(slot0, [observation('a', '2026-09-14T00:05:00.000Z')]),
      snapshot(slot1, [observation('b', '2026-09-14T01:05:00.000Z')]),
    ],
  });
  assert.equal(result.status, 'available');
  assert.deepEqual(result.slots.map((slot) => slot.collectionCompleteness), ['truncated', 'truncated']);
});

test('missing protocol slot fails closed instead of bridging the gap', () => {
  const result = evaluateNaverNewsShadowFirstSeenActivity({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    snapshots: [
      snapshot(slot0, [observation('a', '2026-09-14T00:05:00.000Z')]),
      snapshot(slot2, [observation('c', '2026-09-14T02:05:00.000Z')]),
    ],
  });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'protocol_slot_gap');
  assert.equal(result.unavailableAtSlotStart, slot1);
  assert.equal(result.slots.length, 1);
});

test('unproven observation-set coverage fails closed', () => {
  const second = snapshot(slot1, [observation('b', '2026-09-14T01:05:00.000Z')]);
  const result = evaluateNaverNewsShadowFirstSeenActivity({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    snapshots: [
      snapshot(slot0, [observation('a', '2026-09-14T00:05:00.000Z')]),
      { ...second, observationSetCoverage: { ...second.observationSetCoverage, status: 'incomplete', reason: 'eligible_records_missing_disposition', missingRecordIds: [sha256Canonical({ missing: 1 })] } },
    ],
  });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'observation_set_coverage_unproven');
  assert.equal(result.unavailableAtSlotStart, slot1);
});

test('missing collection evidence fails closed', () => {
  const second = snapshot(slot1, [observation('b', '2026-09-14T01:05:00.000Z')]);
  const result = evaluateNaverNewsShadowFirstSeenActivity({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    snapshots: [
      snapshot(slot0, [observation('a', '2026-09-14T00:05:00.000Z')]),
      { ...second, completeness: { status: 'evidence_unavailable', reason: 'stored_evidence_invalid' } },
    ],
  });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'collection_evidence_unavailable');
});

test('protocol drift in display/start/sort/collection key is rejected', () => {
  const base = snapshot(slot0, [observation('a', '2026-09-14T00:05:00.000Z')]);
  const badRequest = Object.freeze({ ...base.request, display: 50 });
  assert.throws(() => evaluateNaverNewsShadowFirstSeenActivity({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    snapshots: [{ ...base, request: badRequest }],
  }), /naver_news_shadow_first_seen_protocol_mismatch/);
});

test('snapshot history must begin exactly at protocolStart', () => {
  const result = evaluateNaverNewsShadowFirstSeenActivity({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    snapshots: [snapshot(slot1, [observation('b', '2026-09-14T01:05:00.000Z')])],
  });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'protocol_history_incomplete');
});

test('observation collection time must belong to its scheduler slot', () => {
  assert.throws(() => evaluateNaverNewsShadowFirstSeenActivity({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    snapshots: [snapshot(slot0, [observation('a', '2026-09-14T01:05:00.000Z')])],
  }), /naver_news_shadow_first_seen_observation_invalid/);
});

test('empty snapshot list is unavailable, never zero activity', () => {
  const result = evaluateNaverNewsShadowFirstSeenActivity({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    snapshots: [],
  });
  assert.equal(result.status, 'unavailable');
  assert.equal(result.reason, 'snapshot_history_unavailable');
  assert.deepEqual(result.slots, []);
});

test('duplicate job or slot identity fails closed', () => {
  const first = snapshot(slot0, [observation('a', '2026-09-14T00:05:00.000Z')]);
  assert.throws(() => evaluateNaverNewsShadowFirstSeenActivity({
    canonicalArtistId: 'iu',
    protocolStart: slot0,
    snapshots: [first, first],
  }), /naver_news_shadow_first_seen_snapshot_duplicate/);
});
