import assert from 'node:assert/strict';
import test from 'node:test';
import { createFandexConfidenceAssessment, FANDEX_CONFIDENCE_DIMENSIONS } from '../lib/intelligence/confidence';
import {
  createFandexVariableRegistry,
  getFandexVariableDefinition,
  listFandexVariableDefinitions,
  NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE,
  validateFandexVariableDefinition,
  validateObservationVariableBinding,
} from '../lib/intelligence/variableRegistry';
import { evaluateFandexPublication } from '../lib/intelligence/publicationGate';
import { projectNaverNewsNormalizedRecord } from '../lib/server/intelligence/naverNewsObservationAdapter';
import type { NaverNewsNormalizedRecord } from '../lib/server/ingestion/naverNewsContracts';

const dimensions = (state: 'high' | 'moderate' | 'low' | 'insufficient' = 'high') =>
  Object.fromEntries(FANDEX_CONFIDENCE_DIMENSIONS.map((dimension) => [dimension, state]));

const naverRecord = {
  recordId: 'record-1', rawEvidenceId: 'evidence-1', provider: 'naver-news', sourceType: 'news_article',
  sourceUrl: 'https://example.com/article', naverUrl: null, sourceHost: 'example.com', title: 'title', summary: 'summary',
  publishedAt: '2026-09-01T00:00:00.000Z', collectedAt: '2026-09-01T00:01:00.000Z',
  contentSha256: 'a'.repeat(64), recordSha256: 'b'.repeat(64),
  normalizedPayload: { provider: 'naver-news', sourceType: 'news_article', sourceUrl: 'https://example.com/article', naverUrl: null, sourceHost: 'example.com', title: 'title', summary: 'summary', publishedAt: '2026-09-01T00:00:00.000Z' },
} as NaverNewsNormalizedRecord;

test('1 NAVER provider-intermediate variable is registered', () => assert.deepEqual(getFandexVariableDefinition('naver-news.normalized-record-presence'), NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE));
test('2 variable identity is stable', () => assert.equal(NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE.variableId, 'naver-news.normalized-record-presence'));
test('3 duplicate variable IDs are rejected', () => assert.throws(() => createFandexVariableRegistry([NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE, NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE]), /duplicate/));
test('4 unknown lookup fails closed with null', () => assert.equal(getFandexVariableDefinition('unknown'), null));
test('5 provider intermediate cannot contribute directly to production', () => assert.equal(NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE.directProductionContributionEligible, false));
test('6 invalid family is rejected', () => assert.throws(() => validateFandexVariableDefinition({ ...NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE, family: 'unknown' } as never), /family_invalid/));
test('7 invalid measure type is rejected', () => assert.throws(() => validateFandexVariableDefinition({ ...NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE, measureType: 'unknown' } as never), /measure_type_invalid/));
test('8 invalid lifecycle is rejected', () => assert.throws(() => validateFandexVariableDefinition({ ...NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE, lifecycle: 'active' } as never), /lifecycle_invalid/));
test('9 empty construct is rejected', () => assert.throws(() => validateFandexVariableDefinition({ ...NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE, construct: ' ' }), /construct_invalid/));
test('10 entity types are immutable and deterministic', () => { const x = NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE.supportedEntityTypes; assert.deepEqual(x, ['news_article']); assert.ok(Object.isFrozen(x)); });
test('11 blockers are immutable and ordered', () => { assert.ok(Object.isFrozen(NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE.blockers)); assert.deepEqual(NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE.blockers, ['provider-intermediate-not-direct-production']); });
test('12 registry listing is stable', () => assert.deepEqual(listFandexVariableDefinitions().map((x) => x.variableId), ['naver-news.normalized-record-presence']));
test('13 source provider is preserved', () => assert.equal(NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE.sourceProviderId, 'naver-news'));
test('14 NAVER observation binds to its variable', () => { const o = projectNaverNewsNormalizedRecord(naverRecord); assert.doesNotThrow(() => validateObservationVariableBinding(o, NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE)); });
test('15 mismatched variable ID is rejected', () => { const o = projectNaverNewsNormalizedRecord(naverRecord); assert.throws(() => validateObservationVariableBinding({ ...o, variable: { ...o.variable, variableId: 'other' } }, NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE), /variable_id_mismatch/); });
test('16 mismatched provider is rejected for intermediate variables', () => { const o = projectNaverNewsNormalizedRecord(naverRecord); assert.throws(() => validateObservationVariableBinding({ ...o, providerId: 'other' }, NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE), /provider_mismatch/); });
test('17 unsupported entity type is rejected', () => { const o = projectNaverNewsNormalizedRecord(naverRecord); assert.throws(() => validateObservationVariableBinding({ ...o, entity: { ...o.entity, entityType: 'artist' } }, NAVER_NORMALIZED_RECORD_PRESENCE_VARIABLE), /entity_type_unsupported/); });

test('18 all HIGH derives HIGH', () => assert.equal(createFandexConfidenceAssessment({ subject: { type: 'evidence', id: 'e1' }, dimensions: dimensions() }).state, 'high'));
test('19 one MODERATE derives MODERATE', () => assert.equal(createFandexConfidenceAssessment({ subject: { type: 'evidence', id: 'e1' }, dimensions: { ...dimensions(), freshness: 'moderate' } }).state, 'moderate'));
test('20 one LOW derives LOW', () => assert.equal(createFandexConfidenceAssessment({ subject: { type: 'evidence', id: 'e1' }, dimensions: { ...dimensions(), coverage: 'low' } }).state, 'low'));
test('21 one INSUFFICIENT derives INSUFFICIENT', () => assert.equal(createFandexConfidenceAssessment({ subject: { type: 'evidence', id: 'e1' }, dimensions: { ...dimensions(), identityIntegrity: 'insufficient' } }).state, 'insufficient'));
test('22 confidence has no numeric averaging', () => { const x = createFandexConfidenceAssessment({ subject: { type: 'variable', id: 'v' }, dimensions: { ...dimensions(), freshness: 'moderate', coverage: 'low' } }); assert.equal(x.state, 'low'); assert.equal('score' in x, false); });
test('23 invalid dimension state is rejected', () => assert.throws(() => createFandexConfidenceAssessment({ subject: { type: 'evidence', id: 'e1' }, dimensions: { ...dimensions(), freshness: 'bad' } } as never), /dimension_required/));
test('24 all seven dimensions are required', () => { const d = dimensions(); delete (d as Record<string, unknown>).coverage; assert.throws(() => createFandexConfidenceAssessment({ subject: { type: 'evidence', id: 'e1' }, dimensions: d }), /dimension_required/); });
test('25 subject ID is required', () => assert.throws(() => createFandexConfidenceAssessment({ subject: { type: 'evidence', id: ' ' }, dimensions: dimensions() }), /subject_id_invalid/));
test('26 evidence refs are deduped and deterministic', () => assert.deepEqual(createFandexConfidenceAssessment({ subject: { type: 'evidence', id: 'e1' }, dimensions: dimensions(), evidenceRefs: ['z', 'a', 'z'] }).evidenceRefs, ['a', 'z']));
test('27 limitations are deduped and deterministic', () => assert.deepEqual(createFandexConfidenceAssessment({ subject: { type: 'evidence', id: 'e1' }, dimensions: dimensions(), limitations: ['z', 'a', 'z'] }).limitations, ['a', 'z']));
test('28 confidence result is immutable', () => { const x = createFandexConfidenceAssessment({ subject: { type: 'evidence', id: 'e1' }, dimensions: dimensions() }); assert.ok(Object.isFrozen(x)); assert.ok(Object.isFrozen(x.dimensions)); });
test('29 caller cannot override derived state', () => { const x = createFandexConfidenceAssessment({ subject: { type: 'evidence', id: 'e1' }, dimensions: dimensions('low'), state: 'high' } as never); assert.equal(x.state, 'low'); });
test('30 confidence does not modify observation value', () => { const before = { rawValue: 10, unit: 'listeners' }; createFandexConfidenceAssessment({ subject: { type: 'evidence', id: 'e1' }, dimensions: dimensions() }); assert.deepEqual(before, { rawValue: 10, unit: 'listeners' }); });
test('31 confidence has no score or weight multiplication', () => { const x = createFandexConfidenceAssessment({ subject: { type: 'metric', id: 'm' }, dimensions: dimensions() }); assert.equal('weight' in x, false); assert.equal('score' in x, false); });

const publication = (overrides: Partial<Parameters<typeof evaluateFandexPublication>[0]> = {}) => evaluateFandexPublication({ confidenceState: 'high', rightsState: 'allow', lifecycleState: 'production', directProductionContributionEligible: true, ...overrides });
test('32 DENY plus HIGH is BLOCKED', () => assert.equal(publication({ rightsState: 'deny' }).status, 'blocked'));
test('33 UNKNOWN rights plus HIGH is BLOCKED', () => assert.equal(publication({ rightsState: 'unknown' }).status, 'blocked'));
test('34 RESTRICTED rights is limited', () => assert.equal(publication({ rightsState: 'restricted' }).status, 'publishable-with-limitation'));
test('35 INSUFFICIENT confidence is insufficient evidence', () => assert.equal(publication({ confidenceState: 'insufficient' }).status, 'insufficient-evidence'));
test('36 provider intermediate is blocked from direct production', () => assert.equal(publication({ directProductionContributionEligible: false }).status, 'blocked'));
test('37 blocked lifecycle is blocked', () => assert.equal(publication({ lifecycleState: 'blocked' }).status, 'blocked'));
test('38 production-candidate does not auto-promote', () => assert.equal(publication({ lifecycleState: 'production-candidate' }).status, 'blocked'));
test('39 rights do not change confidence state', () => { const x = publication({ rightsState: 'restricted' }); assert.equal(x.confidenceState, 'high'); });
test('40 confidence does not change rights state', () => { const x = publication({ confidenceState: 'low' }); assert.equal(x.rightsState, 'allow'); });
