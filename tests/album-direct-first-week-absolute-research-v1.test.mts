import test from 'node:test';
import assert from 'node:assert/strict';

import type { AlternativeEvidence } from '../lib/alternative-evidence/contracts';
import type { DirectAlbumObservation } from '../lib/alternative-evidence/directAlbumProvider';
import { fromDirectAlbumObservation } from '../lib/alternative-evidence/canonicalAlbumFeatureInput';
import { assessAbsoluteLevel } from '../lib/alternative-evidence/albumMethodology';
import { normalizeAgainstPreviousComparableRelease } from '../lib/alternative-evidence/albumNormalizationResearch';
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

test('authorized direct first-week input satisfies the direct-absolute architecture while rights and baseline data remain independent', () => {
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
    normalizationData: null,
    features: [absolute!],
  });

  assert.equal(readiness.directAbsoluteInputIds.length, 1);
  assert.ok(!readiness.blockers.includes('direct-absolute-sales-input-missing'));
  assert.ok(!readiness.blockers.includes('reported-sales-context-cannot-substitute-authorized-direct-observation'));
  assert.ok(readiness.blockers.includes('provider-acquisition-rights-unresolved'));
  assert.ok(readiness.blockers.includes('normalization-source-authorization-unresolved'));
  assert.ok(readiness.blockers.includes('normalization-data-unassessed'));
  assert.ok(!readiness.blockers.includes('provider-historical-query-semantics-not-fully-verified'));
});

test('prospectively stored authorized comparable observations satisfy history without a historical-query API contract', () => {
  const previousObservation: DirectAlbumObservation = Object.freeze({
    ...observation,
    observationId: 'hanteo-first-week-previous-observation',
    providerObservationId: 'provider-observation-previous',
    providerReleaseId: 'provider-lilac',
    fandexReleaseId: 'research:iu:release:lilac:2021-03-25',
    fandexReleaseFamilyId: 'research:iu:release-family:lilac',
    value: 200000,
    providerPublishedAt: '2021-04-01T00:00:00+09:00',
    observedAt: '2021-04-01T01:00:00+09:00',
    collectedAt: '2021-04-01T01:01:00+09:00',
    evidenceDigest: 'direct-evidence-digest-previous',
  });
  const previousEvidence: AlternativeEvidence = Object.freeze({
    ...evidence,
    evidenceId: 'licensed-hanteo-evidence-previous',
    observedAt: previousObservation.observedAt,
    collectedAt: previousObservation.collectedAt,
    sourcePublishedAt: previousObservation.providerPublishedAt,
    evidenceDigest: previousObservation.evidenceDigest,
  });

  const [current] = projectAuthorizedDirectFirstWeekAbsolute(observation, evidence);
  const [previous] = projectAuthorizedDirectFirstWeekAbsolute(previousObservation, previousEvidence);
  const normalized = normalizeAgainstPreviousComparableRelease(
    {
      releaseDate: '2024-02-20',
      releaseEligibilityState: 'eligible',
      feature: current!,
    },
    [{
      releaseDate: '2021-03-25',
      releaseEligibilityState: 'eligible',
      feature: previous!,
    }],
  );

  assert.equal(normalized.state, 'available');
  assert.equal(normalized.baselineFeatureInputId, previous?.featureInputId);
  assert.equal(normalized.relativeChange, 0.25);

  const hypotheticalAuthorizedProvider = Object.freeze({
    ...HANTEO_FIRST_WEEK_PRODUCTION_EVIDENCE_RESEARCH,
    acquisitionRights: 'allowed' as const,
    normalizedStorageRights: 'allowed' as const,
    derivedPublicationRights: 'allowed' as const,
    directObservationAuthorized: true,
    historicalQuerySemantics: 'unverified' as const,
  });
  const readiness = evaluateMusicAlbumPointProductionReadiness({
    provider: hypotheticalAuthorizedProvider,
    normalization: {
      sourceAuthorizationResolved: true,
      providerPeriodDefinitionResolved: true,
      baselineDefinitionResolved: true,
      crossReleaseComparabilityResolved: true,
      transformationRuleDefined: true,
      revisionPolicyResolved: true,
    },
    normalizationData: normalized,
    features: [previous!, current!],
  });

  assert.equal(readiness.normalizationDataState, 'available');
  assert.equal(readiness.directAbsoluteInputIds.length, 2);
  assert.ok(!readiness.blockers.includes('provider-historical-query-semantics-not-fully-verified'));
  assert.deepEqual(readiness.blockers, []);
  assert.equal(readiness.state, 'eligible-for-production-review');
});

test('reported first-week claims remain outside the direct first-week absolute path', () => {
  assert.equal(ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_DESCRIPTOR.canonicalDirectTransformRequired, true);
  assert.equal(ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_DESCRIPTOR.newsReportedFirstWeekPromotionAllowed, false);
  assert.equal(ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_DESCRIPTOR.productionEligible, false);
});
