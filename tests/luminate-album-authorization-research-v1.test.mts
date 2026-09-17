import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateLuminateFandexAuthorizationGrant,
  LUMINATE_DEFAULT_TERMS_SNAPSHOT_RESEARCH,
  LUMINATE_FANDEX_REQUIRED_GRANTS_RESEARCH,
  projectLuminateProductionEvidenceFromAuthorization,
  type LuminateFandexAuthorizationGrant,
} from '../lib/alternative-evidence/luminateAlbumAuthorizationResearch';

function grant(overrides: Partial<LuminateFandexAuthorizationGrant> = {}): LuminateFandexAuthorizationGrant {
  return {
    agreementKind: 'order-form',
    agreementEvidenceId: 'synthetic-order-form-evidence',
    licenseActive: true,
    physicalProductSalesIncluded: 'expressly-allowed',
    authorizedTerritories: ['US'],
    apiOrDataShareAccess: 'expressly-allowed',
    recurringProgrammaticCollection: 'expressly-allowed',
    normalizedStorage: 'expressly-allowed',
    retentionDuringLicense: 'expressly-allowed',
    commercialProductUse: 'expressly-allowed',
    publicDerivedMetricPublication: 'expressly-allowed',
    publicRankingOrBenchmarking: 'expressly-allowed',
    rawRedistribution: 'not-addressed',
    postTerminationPolicy: 'delete-source-and-retract-provider-derived-output',
    postTerminationPolicyEvidenceId: 'synthetic-termination-policy-evidence',
    ...overrides,
  };
}

test('Luminate default terms are insufficient for public FANDEX Production output', () => {
  const terms = LUMINATE_DEFAULT_TERMS_SNAPSHOT_RESEARCH;

  assert.equal(terms.defaultPermittedUse, 'confidential-internal-business-use');
  assert.equal(terms.separateOrderFormOrWritingMayExpandPermittedUse, true);
  assert.equal(terms.thirdPartySharingOfInternalAnalyticalOutputAllowedByDefault, false);
  assert.equal(terms.publicChartListRankingOrBenchmarkingAllowedByDefault, false);
  assert.equal(terms.publicDisclosureOfLuminateContentAllowedByDefault, false);
  assert.equal(terms.luminateDataTreatedAsConfidentialInformation, true);
  assert.equal(terms.terminationRequiresCeaseUseAndDeleteLuminateContent, true);
  assert.equal(terms.subscriptionAloneEstablishesFandexPublicProductRights, false);
});

test('subscription-only access cannot satisfy explicit FANDEX public-product rights', () => {
  const assessment = evaluateLuminateFandexAuthorizationGrant(grant({
    agreementKind: 'subscription-only',
  }));

  assert.equal(assessment.state, 'blocked');
  assert.ok(assessment.blockers.includes('luminate-explicit-fandex-permitted-use-writing-missing'));
});

test('public derived metric and ranking or benchmarking rights must be explicit', () => {
  const assessment = evaluateLuminateFandexAuthorizationGrant(grant({
    publicDerivedMetricPublication: 'not-addressed',
    publicRankingOrBenchmarking: 'not-allowed',
  }));

  assert.equal(assessment.state, 'blocked');
  assert.ok(assessment.blockers.includes('luminate-public-derived-metric-publication-not-authorized'));
  assert.ok(assessment.blockers.includes('luminate-public-ranking-or-benchmarking-not-authorized'));
});

test('post-termination handling must be resolved because default terms require deletion', () => {
  const assessment = evaluateLuminateFandexAuthorizationGrant(grant({
    postTerminationPolicy: 'unresolved',
    postTerminationPolicyEvidenceId: null,
  }));

  assert.equal(assessment.state, 'blocked');
  assert.ok(assessment.blockers.includes('luminate-post-termination-handling-unresolved'));
  assert.ok(assessment.blockers.includes('luminate-post-termination-policy-evidence-missing'));
});

test('raw redistribution is not required by FANDEX authorization acceptance', () => {
  assert.equal(LUMINATE_FANDEX_REQUIRED_GRANTS_RESEARCH.rawRedistributionRequired, false);
  assert.equal(LUMINATE_FANDEX_REQUIRED_GRANTS_RESEARCH.publicRawPayloadPublicationRequired, false);

  const assessment = evaluateLuminateFandexAuthorizationGrant(grant({
    rawRedistribution: 'not-addressed',
  }));

  assert.equal(assessment.state, 'eligible-for-provider-onboarding-review');
  assert.equal(assessment.rightsResolved, true);
  assert.ok(assessment.nonBlockingGaps.includes('luminate-raw-redistribution-unresolved-not-used-by-fandex'));
});

test('an explicit complete grant resolves provider rights but does not create any actual observation', () => {
  const assessment = evaluateLuminateFandexAuthorizationGrant(grant({
    authorizedTerritories: ['US', 'CA'],
  }));
  const provider = projectLuminateProductionEvidenceFromAuthorization(assessment);

  assert.equal(assessment.state, 'eligible-for-provider-onboarding-review');
  assert.deepEqual(assessment.authorizedTerritories, ['US', 'CA']);
  assert.equal(provider.acquisitionRights, 'allowed');
  assert.equal(provider.normalizedStorageRights, 'allowed');
  assert.equal(provider.derivedPublicationRights, 'allowed');
  assert.equal(provider.directObservationAuthorized, true);
  assert.equal(provider.periodSemantics, 'verified');
  assert.equal(provider.revisionSemantics, 'verified');
});
