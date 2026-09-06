import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adaptCanonicalNaverNewsObservationToArtistReadEntry,
  FANDEX_NAVER_CANONICAL_ARTIST_READ_ENTRY_CONTRACT_VERSION,
} from '../lib/server/intelligence/naverCanonicalArtistReadAdapter';
import { NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE } from '../lib/intelligence/variableRegistry';
import type { CanonicalNaverNewsObservation } from '../lib/server/ingestion/naverNewsCanonicalObservation';

/* const base = (): CanonicalNaverNewsObservation => ({
  observationId: 'observation-1', candidateId: 'candidate-1', canonicalArtistId: 'artist-iu', provider: 'naver-news', sourceType: 'news_article',
  canonicalSourceUrl: 'https://n.news.naver.com/article/001/1', observedAt: '2026-01-01T00:00:00.000Z', collectedAt: '2026-01-02T00:00:00.000Z',
  title: '아이유 새 기사', summary: '기사 요약', sourceRecordIds: ['record-1', 'record-2'], rawEvidenceIds: ['raw-1', 'raw-2'],
  relevanceVerification: { status: 'accepted', reason: 'canonical_korean_alias_in_title', matchedEvidence: { field: 'title', alias: '아이유' } },
}); */
const base = (): CanonicalNaverNewsObservation => ({
  observationId: 'observation-1', candidateId: 'candidate-1', canonicalArtistId: 'artist-iu', provider: 'naver-news', sourceType: 'news_article',
  canonicalSourceUrl: 'https://n.news.naver.com/article/001/1', observedAt: '2026-01-01T00:00:00.000Z', collectedAt: '2026-01-02T00:00:00.000Z',
  title: 'IU article', summary: 'IU summary', sourceRecordIds: ['record-1', 'record-2'], rawEvidenceIds: ['raw-1', 'raw-2'],
  relevanceVerification: { status: 'accepted', reason: 'canonical_korean_alias_in_title', matchedEvidence: { field: 'title', alias: 'IU' } },
});
const adapt = (overrides: Record<string, unknown> = {}) => adaptCanonicalNaverNewsObservationToArtistReadEntry({ ...base(), ...overrides } as CanonicalNaverNewsObservation);

test('accepted canonical observation adapts as a canonical evidence artist entry', () => {
  const entry = adapt();
  assert.equal(entry.entryId, 'observation-1');
  assert.equal(entry.contractVersion, FANDEX_NAVER_CANONICAL_ARTIST_READ_ENTRY_CONTRACT_VERSION);
  assert.deepEqual(entry.artist, { entityType: 'artist', entityId: 'artist-iu' });
  assert.deepEqual(entry.semantic, { entryKind: 'canonical-evidence', family: 'media', variableId: null, metricId: null });
});

for (const [field, expected] of [
  ['observationId', 'observation-1'], ['candidateId', 'candidate-1'], ['canonicalArtistId', 'artist-iu'], ['provider', 'naver-news'],
  ['sourceType', 'news_article'], ['canonicalSourceUrl', 'https://n.news.naver.com/article/001/1'], ['observedAt', '2026-01-01T00:00:00.000Z'],
  ['collectedAt', '2026-01-02T00:00:00.000Z'], ['title', 'IU article'], ['summary', 'IU summary'],
] as const) test(`${field} is preserved losslessly`, () => {
  const entry = adapt();
  const values: Record<string, unknown> = { observationId: entry.canonicalObservation.observationId, candidateId: entry.canonicalObservation.candidateId, canonicalArtistId: entry.artist.entityId, provider: entry.source.providerId, sourceType: entry.source.sourceType, canonicalSourceUrl: entry.source.canonicalSourceUrl, observedAt: entry.time.observedAt, collectedAt: entry.time.collectedAt, title: entry.content.title, summary: entry.content.summary };
  assert.equal(values[field], expected);
});

/* test('evidence arrays and relevance evidence are preserved', () => {
  const entry = adapt();
  assert.deepEqual(entry.evidence.sourceRecordIds, ['record-1', 'record-2']);
  assert.deepEqual(entry.evidence.rawEvidenceIds, ['raw-1', 'raw-2']);
  assert.equal(entry.relevance.status, 'accepted');
  assert.equal(entry.relevance.reason, 'canonical_korean_alias_in_title');
  assert.deepEqual(entry.relevance.matchedEvidence, { field: 'title', alias: '아이유' });
});

}); */
test('evidence arrays and relevance evidence are preserved', () => {
  const entry = adapt();
  assert.deepEqual(entry.evidence.sourceRecordIds, ['record-1', 'record-2']);
  assert.deepEqual(entry.evidence.rawEvidenceIds, ['raw-1', 'raw-2']);
  assert.equal(entry.relevance.status, 'accepted');
  assert.equal(entry.relevance.reason, 'canonical_korean_alias_in_title');
  assert.deepEqual(entry.relevance.matchedEvidence, { field: 'title', alias: 'IU' });
});

for (const [name, overrides] of [
  ['empty artist id', { canonicalArtistId: '' }], ['empty observation id', { observationId: '' }], ['empty candidate id', { candidateId: '' }],
  ['empty URL', { canonicalSourceUrl: '' }], ['empty provider', { provider: '' }], ['empty source type', { sourceType: '' }],
  ['invalid observed timestamp', { observedAt: 'not-a-date' }], ['invalid collected timestamp', { collectedAt: 'not-a-date' }],
  ['non-string title', { title: null }], ['non-string summary', { summary: null }], ['missing source records', { sourceRecordIds: null }],
  ['blank raw evidence id', { rawEvidenceIds: [''] }], ['missing relevance', { relevanceVerification: null }],
  ['rejected relevance', { relevanceVerification: { status: 'rejected', reason: 'insufficient_identity_evidence', matchedEvidence: null } }],
  ['unknown relevance', { relevanceVerification: { status: 'unknown', reason: 'insufficient_identity_evidence', matchedEvidence: null } }],
  ['invalid matched evidence', { relevanceVerification: { status: 'accepted', reason: 'canonical_korean_alias_in_title', matchedEvidence: { field: 'other', alias: 'x' } } }],
  ['invalid relevance reason', { relevanceVerification: { status: 'accepted', reason: 'invalid', matchedEvidence: { field: 'title', alias: 'IU' } } }],
] as const) test(`${name} fails closed`, () => assert.throws(() => adapt(overrides), /naver_news_read_entry_/));

test('canonical artist identity is copied exactly without lookup or normalization', () => {
  const entry = adapt({ canonicalArtistId: '  artist-raw  ' });
  assert.equal(entry.artist.entityId, '  artist-raw  ');
});
/* test('one observation yields one artist owner and no inferred secondary artist', () => {
  const entry = adapt({ title: '아이유와 다른 가수' });
  assert.deepEqual(entry.artist, { entityType: 'artist', entityId: 'artist-iu' });
  assert.equal(Object.keys(entry.artist).length, 2);
});
}); */
test('one observation yields one artist owner and no inferred secondary artist', () => {
  const entry = adapt({ title: 'IU and another artist' });
  assert.deepEqual(entry.artist, { entityType: 'artist', entityId: 'artist-iu' });
  assert.equal(Object.keys(entry.artist).length, 2);
});
test('null matched evidence remains null', () => assert.equal(adapt({ relevanceVerification: { status: 'accepted', reason: 'canonical_korean_alias_in_summary', matchedEvidence: null } }).relevance.matchedEvidence, null));
test('output is deeply immutable and input is not mutated', () => {
  const input = base(); const before = JSON.stringify(input); const entry = adapt(input as unknown as Record<string, unknown>);
  assert.equal(Object.isFrozen(entry), true); assert.equal(Object.isFrozen(entry.artist), true); assert.equal(Object.isFrozen(entry.source), true); assert.equal(Object.isFrozen(entry.time), true); assert.equal(Object.isFrozen(entry.content), true); assert.equal(Object.isFrozen(entry.evidence), true); assert.equal(Object.isFrozen(entry.evidence.sourceRecordIds), true); assert.equal(Object.isFrozen(entry.relevance), true); assert.equal(Object.isFrozen(entry.relevance.matchedEvidence), true); assert.equal(JSON.stringify(input), before);
});
test('same input is deterministic and temporal fields remain distinct', () => { const a = adapt(); const b = adapt(); assert.deepEqual(a, b); assert.notEqual(a.time.observedAt, a.time.collectedAt); });
test('no generic observation, metric, score, confidence, rights, or publication decision is fabricated', () => {
  const entry = adapt() as Record<string, unknown>;
  assert.equal('value' in entry, false); assert.equal('score' in entry, false); assert.equal('confidence' in entry, false); assert.equal('publicationDecision' in entry, false); assert.equal(entry.semantic && (entry.semantic as any).variableId, null);
});
test('global normalized NAVER variable remains provider-intermediate research metadata', () => {
  assert.equal(NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE.kind, 'provider-intermediate'); assert.equal(NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE.lifecycle, 'research'); assert.equal(NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE.directProductionContributionEligible, false);
});
test('strict interval remains a downstream blocked concern', () => { const entry = adapt(); assert.equal(entry.semantic.entryKind, 'canonical-evidence'); assert.equal('interval' in entry, false); });
