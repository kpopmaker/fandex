import test from 'node:test';
import assert from 'node:assert/strict';

import type { AlternativeEvidence } from '../lib/alternative-evidence/contracts';
import type { DirectAlbumObservation } from '../lib/alternative-evidence/directAlbumProvider';
import { fromDirectAlbumObservation } from '../lib/alternative-evidence/canonicalAlbumFeatureInput';
import { assessAbsoluteLevel } from '../lib/alternative-evidence/albumMethodology';
import {
  ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_DESCRIPTOR,
  projectAuthorizedDirectFirstWeekAbsolute,
} from '../lib/alternative-evidence/albumDirectFirstWeekAbsoluteResearch';
import { evaluateMusicAlbumPointProductionReadiness } from '../lib/alternative-evidence/albumProductionReadinessResearch';
import { HANTEO_FIRST_WEEK_PRODUCTION_EVIDENCE_RESEARCH } from '../lib/alternative-evidence/hanteoFirstWeekProductionEvidenceResearch';

const observation: DirectAlbumObservation = Object.freeze({
  contractVersion: 'direct-album-observation-v1',
  observationId: 'hanteo-first-week-observation',
  providerId: 'hanteo-chart',
  providerObservationId: 'provider-observation-1',
  providerArtistId: 'provider-iu',
  providerReleaseId: 'provider-the-winning',
  providerEditionId: null,
  providerSkuId: null,
  fandexArtistId: 'iu',
  fandexReleaseId: 'research:iu:release:the-winning:2024-02-20',
  fandexReleaseFamilyId: 'research:iu:release-family:the-winning',
  semantic: 'first-week-sale',
  value: 250000,
  unit: 'physical-units',
  territory: 'KR',
  format: 'physical-album',
  providerPeriod: 'release-relative-first-week',
  providerPublishedAt: '2024-02-27T00:00:00+09:00',
  observedAt: '2024-02-27T01:00:00+09:00',
  collectedAt: '2024-02-27T01:01:00+09:00',
  revisionId: null,
  revisionObservedAt: null,
  supersedesObservationId: null,
  knowledgeMode: 'current-research',
  scopeRole: 'release-total',
  parentObservationId: null,
  evidenceDigest: 'direct-evidence-digest',
  syntheticFixture: true,
});

const evidence: AlternativeEvidence = Object.freeze({
  evidenceId: 'licensed-hanteo-evidence',
  origin: 'direct-licensed-provider',
  sourceId: 'hanteo-chart',
  sourceUrl: null,
  acquisitionProvider: 'hanteo-chart',
  reportedProvider: 'hanteo-chart',
  observedAt: observation.observedAt,
  collectedAt: observation.collectedAt,
  sourcePublishedAt: observation.providerPublishedAt,
  evidenceDigest: observation.evidenceDigest,
  researchOnly: true,
  contractVersion: 'alternative-evidence-v1',
});

test('generic direct converter currently treats first-week as context, specialized projection fixes the absolute path', () => {
  const [generic] = fromDirectAlbumObservation(observation, evidence);
  assert.equal(generic?.featureKey, 'reportedFirstWeekSales');
  assert.equal(generic?.featureRole, 'context');

  const [absolute] = projectAuthorizedDirectFirstWeekAbsolute(observation, evidence);
  assert.equal(absolute?.featureKey, 'physicalPurchaseAbsoluteLevel');
  assert.equal(absolute?.featureRole, 'absolute');
  assert.equal(absolute?.sourceClass, 'direct-provider');
  assert.equal(absolute?.semantic, 'first-week-sale');
  assert.equal(absolute?.unit, 'physical-units');
  assert.equal(absolute?.periodType, 'first-week');
  assert.equal(absolute?.value, 250000);
  assert.equal(absolute?.eligibilityState, 'feature-resolver-candidate');
  assert.equal(absolute?.proxyFallbackState, 'absolute-available');
  assert.equal(assessAbsoluteLevel([absolute!]).state, 'ready');
});

test('projection preserves the underlying contribution identity rather than double-counting a transformed copy', () => {
  const [generic] = fromDirectAlbumObservation(observation, evidence);
  const [absolute] = projectAuthorizedDirectFirstWeekAbsolute(observation, evidence);
  assert.equal(absolute?.contributionIdentity.contributionIdentityId, generic?.contributionIdentity.contributionIdentityId);
  assert.notEqual(absolute?.featureInputId, generic?.featureInputId);
});

test('non-first-week observations cannot enter the specialized primary anchor', () => {
  assert.throws(
    () => projectAuthorizedDirectFirstWeekAbsolute({ ...observation, semantic: 'period-sale' }, evidence),
    /direct_first_week_absolute_semantic_required/,
  );
});

test('authorized direct first-week input satisfies the direct-absolute architecture while rights still remain independent', () => {
  const [absolute] = projectAuthorizedDirectFirstWeekAbsolute(observation, evidence);
  const readiness = evaluateMusicAlbumPointProductionReadiness({
    provider: HANTEO_FIRST_WEEK_PRODUCTION_EVIDENCE_RESEARCH,
    normalization: {
      sourceAuthorizationResolved: false,
      providerPeriodDefinitionResolved: true,
      baselineDefinitionResolved: true,
      crossReleaseComparabilityResolved: true,
      transformationRuleDefined: true,
      revisionPolicyResolved: true,
    },
    features: [absolute!],
  });

  assert.equal(readiness.directAbsoluteInputIds.length, 1);
  assert.ok(!readiness.blockers.includes('direct-absolute-sales-input-missing'));
  assert.ok(!readiness.blockers.includes('reported-sales-context-cannot-substitute-authorized-direct-observation'));
  assert.ok(readiness.blockers.includes('provider-acquisition-rights-unresolved'));
  assert.ok(readiness.blockers.includes('normalization-source-authorization-unresolved'));
});

test('descriptor explicitly forbids promoting news-reported first-week claims through this projection', () => {
  assert.equal(ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_DESCRIPTOR.newsReportedFirstWeekPromotionAllowed, false);
  assert.equal(ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_DESCRIPTOR.productionEligible, false);
});
