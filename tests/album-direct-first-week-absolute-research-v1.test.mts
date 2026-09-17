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

test('authorized direct first-week physical units are canonical absolute input', () => {
  const [direct] = fromDirectAlbumObservation(observation, evidence);
  assert.equal(direct?.featureKey, 'physicalPurchaseAbsoluteLevel');
  assert.equal(direct?.featureRole, 'absolute');
  assert.equal(direct?.sourceClass, 'direct-provider');
  assert.equal(direct?.semantic, 'first-week-sale');
  assert.equal(direct?.unit, 'physical-units');
  assert.equal(direct?.periodType, 'first-week');
  assert.equal(direct?.value, 250000);
  assert.equal(direct?.eligibilityState, 'feature-resolver-candidate');
  assert.equal(direct?.proxyFallbackState, 'absolute-available');
  assert.equal(assessAbsoluteLevel([direct!]).state, 'ready');
});

test('first-week guard returns the same canonical observation instead of creating a duplicate projection', () => {
  const [direct] = fromDirectAlbumObservation(observation, evidence);
  const [guarded] = projectAuthorizedDirectFirstWeekAbsolute(observation, evidence);
  assert.equal(guarded?.contributionIdentity.contributionIdentityId, direct?.contributionIdentity.contributionIdentityId);
  assert.equal(guarded?.featureInputId, direct?.featureInputId);
  assert.equal(guarded?.featureInputFamilyId, direct?.featureInputFamilyId);
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

test('reported first-week claims remain outside the direct first-week absolute path', () => {
  assert.equal(ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_DESCRIPTOR.canonicalDirectTransformRequired, true);
  assert.equal(ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_DESCRIPTOR.newsReportedFirstWeekPromotionAllowed, false);
  assert.equal(ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_DESCRIPTOR.productionEligible, false);
});
