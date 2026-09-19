import assert from 'node:assert/strict';
import test from 'node:test';

import type { LuminateFandexAuthorizationGrant } from '../lib/alternative-evidence/luminateAlbumAuthorizationResearch';
import {
  assessIuLuminateLicensedBootstrap,
  buildIuLuminateLicensedBootstrapManifest,
  IU_LUMINATE_LICENSED_BOOTSTRAP_RESEARCH_DESCRIPTOR,
} from '../lib/alternative-evidence/iuLuminateLicensedBootstrapResearch';
import { evaluateIuLuminateProviderIdentityCandidate } from '../lib/alternative-evidence/iuLuminateProviderIdentityReviewResearch';
import { buildLuminateSnowflakeBreakoutEvidence } from '../lib/alternative-evidence/luminateSnowflakeAlbumExtractionResearch';
import {
  IU_PIECES_RELEASE_FAMILY_ID,
  IU_PIECES_RELEASE_ID,
} from '../lib/alternative-evidence/iuPiecesResearchEvidence';
import {
  IU_THE_WINNING_RELEASE_FAMILY_ID,
  IU_THE_WINNING_RELEASE_ID,
} from '../lib/alternative-evidence/iuTheWinningResearchEvidence';

function grant(overrides: Partial<LuminateFandexAuthorizationGrant> = {}): LuminateFandexAuthorizationGrant {
  return {
    agreementKind: 'order-form',
    agreementEvidenceId: 'executed-order-form-evidence',
    licenseActive: true,
    physicalProductSalesIncluded: 'expressly-allowed',
    authorizedTerritories: ['US'],
    apiOrDataShareAccess: 'expressly-allowed',
    recurringProgrammaticCollection: 'expressly-allowed',
    normalizedStorage: 'expressly-allowed',
    retentionDuringLicense: 'expressly-allowed',
    commercialProductUse: 'expressly-allowed',
    publicOutputMode: 'derived-metric-only',
    publicDerivedMetricPublication: 'expressly-allowed',
    publicRankingOrBenchmarking: 'not-addressed',
    rawRedistribution: 'not-addressed',
    postTerminationPolicy: 'delete-source-and-retract-provider-derived-output',
    postTerminationPolicyEvidenceId: 'executed-post-termination-policy-evidence',
    ...overrides,
  };
}

const breakouts = buildLuminateSnowflakeBreakoutEvidence({
  metricCategoryProductSales: 'licensed:ProductSales',
  distributionChannelPhysical: 'licensed:Physical',
  purchaseMethodOnline: 'licensed:Online',
  purchaseMethodStorefront: 'licensed:Storefront',
  physicalProductFormats: ['CD', 'Vinyl'],
});

function currentIdentity(mrelgId = 'licensed:mrelg:the-winning') {
  return evaluateIuLuminateProviderIdentityCandidate({
    fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
    fandexReleaseFamilyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
    canonicalTitle: 'The Winning',
    releaseDate: '2024-02-20',
    mrelgId,
    luminateTitle: 'The Winning',
    luminateDisplayArtist: 'IU',
    luminateReleaseDate: '2024-02-20',
    matchedBarcodes: ['8804775368752', '8804775368769'],
    reviewed: true,
  });
}

function baselineIdentity(mrelgId = 'licensed:mrelg:pieces') {
  return evaluateIuLuminateProviderIdentityCandidate({
    fandexReleaseId: IU_PIECES_RELEASE_ID,
    fandexReleaseFamilyId: IU_PIECES_RELEASE_FAMILY_ID,
    canonicalTitle: 'Pieces',
    releaseDate: '2021-12-29',
    mrelgId,
    luminateTitle: 'Pieces',
    luminateDisplayArtist: 'IU',
    luminateReleaseDate: '2021-12-29',
    matchedBarcodes: ['8804775236938'],
    reviewed: true,
  });
}

function manifest(overrides: Record<string, unknown> = {}) {
  return buildIuLuminateLicensedBootstrapManifest({
    grant: grant(),
    territory: 'US',
    access: {
      surface: 'snowflake-data-share',
      evidenceId: 'licensed-data-share-scope-evidence',
      shareObjectInventoryEvidenceId: 'licensed-share-object-inventory-evidence',
      availableViews: [
        'VW_DAILY_FACT_MRELG_DETAIL_DS',
        'VW_MUSICAL_RELEASE_GROUP_DS',
        'VW_FACT_VALUES_DS',
      ],
    },
    breakouts,
    currentIdentity: currentIdentity(),
    baselineIdentity: baselineIdentity(),
    ...overrides,
  } as Parameters<typeof buildIuLuminateLicensedBootstrapManifest>[0]);
}

test('generic API-or-Data-Share grant is not treated as surface-specific Data Share evidence', () => {
  assert.equal(IU_LUMINATE_LICENSED_BOOTSTRAP_RESEARCH_DESCRIPTOR.genericApiOrDataShareGrantAloneSufficient, false);
  const m = manifest({
    access: {
      surface: 'snowflake-data-share',
      evidenceId: '',
      shareObjectInventoryEvidenceId: '',
      availableViews: [],
    },
  });
  const assessment = assessIuLuminateLicensedBootstrap(m);
  assert.equal(assessment.state, 'blocked');
  assert.ok(assessment.blockers.includes('iu-luminate-bootstrap-data-share-access-evidence-missing'));
  assert.ok(assessment.blockers.includes('iu-luminate-bootstrap-share-object-inventory-evidence-missing'));
});

test('authorized territory must match the bootstrap extraction lane', () => {
  const assessment = assessIuLuminateLicensedBootstrap(manifest({
    grant: grant({ authorizedTerritories: ['CA'] }),
    territory: 'US',
  }));
  assert.equal(assessment.state, 'blocked');
  assert.ok(assessment.blockers.includes('iu-luminate-bootstrap-territory-not-authorized'));
});

test('required licensed share views must be present before extraction plans are emitted', () => {
  const assessment = assessIuLuminateLicensedBootstrap(manifest({
    access: {
      surface: 'snowflake-data-share',
      evidenceId: 'licensed-data-share-scope-evidence',
      shareObjectInventoryEvidenceId: 'inventory-evidence',
      availableViews: ['VW_MUSICAL_RELEASE_GROUP_DS', 'VW_FACT_VALUES_DS'],
    },
  }));
  assert.equal(assessment.state, 'blocked');
  assert.ok(assessment.blockers.includes(
    'iu-luminate-bootstrap-required-view-missing:VW_DAILY_FACT_MRELG_DETAIL_DS',
  ));
  assert.equal(assessment.currentExtractionPlan, null);
});

test('resolved agreement, surface, breakouts and distinct MRELG IDs produce exactly two same-lane plans', () => {
  const assessment = assessIuLuminateLicensedBootstrap(manifest());
  assert.equal(assessment.state, 'ready-for-licensed-extraction-review');
  assert.equal(assessment.authorizationState, 'eligible-for-provider-onboarding-review');
  assert.equal(assessment.currentExtractionPlan?.mrelgId, 'licensed:mrelg:the-winning');
  assert.equal(assessment.currentExtractionPlan?.providerPeriod, '2024-02-20/2024-02-26');
  assert.equal(assessment.currentExtractionPlan?.territory, 'US');
  assert.equal(assessment.baselineExtractionPlan?.mrelgId, 'licensed:mrelg:pieces');
  assert.equal(assessment.baselineExtractionPlan?.providerPeriod, '2021-12-29/2022-01-04');
  assert.equal(assessment.baselineExtractionPlan?.territory, 'US');
  assert.match(assessment.manifestDigest, /^[0-9a-f]{64}$/);
});

test('same MRELG cannot be used for The Winning and Pieces', () => {
  const same = 'licensed:mrelg:same';
  const assessment = assessIuLuminateLicensedBootstrap(manifest({
    currentIdentity: currentIdentity(same),
    baselineIdentity: baselineIdentity(same),
  }));
  assert.equal(assessment.state, 'blocked');
  assert.ok(assessment.blockers.includes('iu-luminate-cross-release-mrelg-reuse-forbidden'));
});

test('inactive or incomplete rights stop plan generation even if Data Share metadata is ready', () => {
  const assessment = assessIuLuminateLicensedBootstrap(manifest({
    grant: grant({ licenseActive: false }),
  }));
  assert.equal(assessment.state, 'blocked');
  assert.ok(assessment.blockers.includes('luminate-license-not-active'));
  assert.equal(assessment.currentExtractionPlan, null);
  assert.equal(assessment.baselineExtractionPlan, null);
});

test('manifest carries no credential or secret field', () => {
  const serialized = JSON.stringify(manifest());
  assert.ok(!serialized.includes('password'));
  assert.ok(!serialized.includes('token'));
  assert.ok(!serialized.includes('privateKey'));
  assert.equal(IU_LUMINATE_LICENSED_BOOTSTRAP_RESEARCH_DESCRIPTOR.credentialsStoredInManifest, false);
  assert.equal(IU_LUMINATE_LICENSED_BOOTSTRAP_RESEARCH_DESCRIPTOR.secretsStoredInManifest, false);
});
