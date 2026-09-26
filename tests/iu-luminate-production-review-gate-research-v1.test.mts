import assert from 'node:assert/strict';
import test from 'node:test';

import type { LuminateFandexAuthorizationGrant } from '../lib/alternative-evidence/luminateAlbumAuthorizationResearch';
import {
  buildLuminateObservationWriteGrantDigest,
} from '../lib/alternative-evidence/luminateAlbumObservationIntakeResearch';
import {
  buildIuLuminateLicensedBootstrapManifest,
  type IuLuminateLicensedBootstrapManifest,
} from '../lib/alternative-evidence/iuLuminateLicensedBootstrapResearch';
import {
  evaluateIuLuminateProductionReviewGate,
  IU_LUMINATE_PRODUCTION_REVIEW_GATE_RESEARCH_DESCRIPTOR,
} from '../lib/alternative-evidence/iuLuminateProductionReviewGateResearch';
import { evaluateIuLuminateProviderIdentityCandidate } from '../lib/alternative-evidence/iuLuminateProviderIdentityReviewResearch';
import {
  buildLuminateSnowflakeBreakoutEvidence,
} from '../lib/alternative-evidence/luminateSnowflakeAlbumExtractionResearch';
import type {
  IuLuminateStoredNormalizationRead,
} from '../lib/alternative-evidence/luminateAlbumObservationStoredReaderResearch';
import {
  IU_PIECES_RELEASE_FAMILY_ID,
  IU_PIECES_RELEASE_ID,
} from '../lib/alternative-evidence/iuPiecesResearchEvidence';
import {
  IU_THE_WINNING_RELEASE_FAMILY_ID,
  IU_THE_WINNING_RELEASE_ID,
} from '../lib/alternative-evidence/iuTheWinningResearchEvidence';

function grant(): LuminateFandexAuthorizationGrant {
  return {
    agreementKind: 'order-form',
    agreementEvidenceId: 'agreement:v1',
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
    postTerminationPolicyEvidenceId: 'post-termination:v1',
  };
}

function manifest(): IuLuminateLicensedBootstrapManifest {
  const currentIdentity = evaluateIuLuminateProviderIdentityCandidate({
    fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
    fandexReleaseFamilyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
    canonicalTitle: 'The Winning',
    releaseDate: '2024-02-20',
    mrelgId: 'mrelg:winning',
    luminateTitle: 'The Winning',
    luminateDisplayArtist: 'IU',
    luminateReleaseDate: '2024-02-20',
    matchedBarcodes: ['8804775368752'],
    reviewed: true,
  });
  const baselineIdentity = evaluateIuLuminateProviderIdentityCandidate({
    fandexReleaseId: IU_PIECES_RELEASE_ID,
    fandexReleaseFamilyId: IU_PIECES_RELEASE_FAMILY_ID,
    canonicalTitle: 'Pieces',
    releaseDate: '2021-12-29',
    mrelgId: 'mrelg:pieces',
    luminateTitle: 'Pieces',
    luminateDisplayArtist: 'IU',
    luminateReleaseDate: '2021-12-29',
    matchedBarcodes: ['8804775236938'],
    reviewed: true,
  });
  const breakouts = buildLuminateSnowflakeBreakoutEvidence({
    metricCategoryProductSales: 'licensed:ProductSales',
    distributionChannelPhysical: 'licensed:Physical',
    purchaseMethodOnline: 'licensed:Online',
    purchaseMethodStorefront: 'licensed:Storefront',
    physicalProductFormats: ['CD', 'Vinyl'],
  });

  return buildIuLuminateLicensedBootstrapManifest({
    grant: grant(),
    territory: 'US',
    access: {
      surface: 'snowflake-data-share',
      evidenceId: 'data-share:scope:v1',
      shareObjectInventoryEvidenceId: 'data-share:inventory:v1',
      availableViews: [
        'VW_DAILY_FACT_MRELG_DETAIL_DS',
        'VW_MUSICAL_RELEASE_GROUP_DS',
        'VW_FACT_VALUES_DS',
      ],
    },
    breakouts,
    currentIdentity,
    baselineIdentity,
  });
}

function storedRead(overrides: Partial<IuLuminateStoredNormalizationRead> = {}): IuLuminateStoredNormalizationRead {
  return {
    releaseIdsQueried: [
      IU_THE_WINNING_RELEASE_ID,
      IU_PIECES_RELEASE_ID,
    ],
    rowsRead: 2,
    authorizationLineage: {
      agreementEvidenceIds: ['agreement:v1'],
      postTerminationPolicyEvidenceIds: ['post-termination:v1'],
      publicOutputModes: ['derived-metric-only'],
      writeGrantDigests: [buildLuminateObservationWriteGrantDigest(grant())],
      authorizedTerritories: ['US'],
    },
    resolution: {
      state: 'available',
      territory: 'US',
      currentReleaseId: IU_THE_WINNING_RELEASE_ID,
      selectedBaselineReleaseId: IU_PIECES_RELEASE_ID,
      selectedBaselineTitle: 'Pieces',
      attemptedBaselineReleaseIds: [IU_PIECES_RELEASE_ID],
      reaction: {
        state: 'available',
        currentFeatureInputId: 'feature:current',
        baselineFeatureInputId: 'feature:baseline',
        currentPhysicalUnits: 300,
        baselinePhysicalUnits: 200,
        relativeChange: 0.5,
        blockers: [],
      },
      blockers: [],
    },
    effects: {
      databaseReads: 1,
      databaseWrites: 0,
      externalCalls: 0,
    },
    ...overrides,
  };
}

test('gate is review-only and cannot activate or publish Product', () => {
  const descriptor = IU_LUMINATE_PRODUCTION_REVIEW_GATE_RESEARCH_DESCRIPTOR;
  assert.equal(descriptor.lifecycle, 'research');
  assert.equal(descriptor.productActivationAllowedByThisGate, false);
  assert.equal(descriptor.productPublicationAllowedByThisGate, false);
  assert.equal(descriptor.methodologyFreezePerformedByThisGate, false);
  assert.equal(descriptor.methodologyLockCreatedByThisGate, false);
});

test('matching rights, bootstrap, stored lineage and normalized data become eligible for production review', () => {
  const result = evaluateIuLuminateProductionReviewGate({
    manifest: manifest(),
    storedRead: storedRead(),
  });
  assert.equal(result.state, 'eligible-for-production-review');
  assert.equal(result.providerState, 'ready');
  assert.equal(result.bootstrapState, 'ready');
  assert.equal(result.normalizationDefinitionState, 'ready-for-freeze-review');
  assert.equal(result.normalizationDataState, 'available');
  assert.equal(result.authorizationLineageState, 'matched');
  assert.equal(result.relativeChange, 0.5);
  assert.deepEqual(result.blockers, []);
});

test('stored rows from another agreement lineage are blocked even if their own snapshots were individually valid', () => {
  const read = storedRead({
    authorizationLineage: {
      agreementEvidenceIds: ['agreement:old'],
      postTerminationPolicyEvidenceIds: ['post-termination:v1'],
      publicOutputModes: ['derived-metric-only'],
      writeGrantDigests: [buildLuminateObservationWriteGrantDigest({
        ...grant(),
        agreementEvidenceId: 'agreement:old',
      })],
      authorizedTerritories: ['US'],
    },
  });
  const result = evaluateIuLuminateProductionReviewGate({
    manifest: manifest(),
    storedRead: read,
  });
  assert.equal(result.state, 'blocked');
  assert.equal(result.authorizationLineageState, 'blocked');
  assert.ok(result.blockers.includes('iu-luminate-review-agreement-lineage-mismatch'));
});

test('multiple write-grant snapshots require explicit review on the initial golden path', () => {
  const read = storedRead({
    authorizationLineage: {
      agreementEvidenceIds: ['agreement:v1'],
      postTerminationPolicyEvidenceIds: ['post-termination:v1'],
      publicOutputModes: ['derived-metric-only'],
      writeGrantDigests: ['a'.repeat(64), 'b'.repeat(64)],
      authorizedTerritories: ['US'],
    },
  });
  const result = evaluateIuLuminateProductionReviewGate({
    manifest: manifest(),
    storedRead: read,
  });
  assert.equal(result.state, 'blocked');
  assert.ok(result.blockers.includes(
    'iu-luminate-review-multiple-write-grant-snapshots-require-explicit-review',
  ));
});

test('same agreement evidence IDs still fail when the stored grant snapshot differs from the current manifest grant', () => {
  const staleDigest = buildLuminateObservationWriteGrantDigest({
    ...grant(),
    authorizedTerritories: ['US', 'CA'],
  });
  const read = storedRead({
    authorizationLineage: {
      agreementEvidenceIds: ['agreement:v1'],
      postTerminationPolicyEvidenceIds: ['post-termination:v1'],
      publicOutputModes: ['derived-metric-only'],
      writeGrantDigests: [staleDigest],
      authorizedTerritories: ['US'],
    },
  });
  const result = evaluateIuLuminateProductionReviewGate({
    manifest: manifest(),
    storedRead: read,
  });
  assert.equal(result.state, 'blocked');
  assert.equal(result.authorizationLineageState, 'blocked');
  assert.ok(result.blockers.includes('iu-luminate-review-write-grant-digest-mismatch'));
});

test('missing stored normalization data remains blocked and never becomes zero', () => {
  const read = storedRead({
    rowsRead: 0,
    authorizationLineage: {
      agreementEvidenceIds: [],
      postTerminationPolicyEvidenceIds: [],
      publicOutputModes: [],
      writeGrantDigests: [],
      authorizedTerritories: [],
    },
    resolution: {
      state: 'current-observation-missing',
      territory: 'US',
      currentReleaseId: IU_THE_WINNING_RELEASE_ID,
      selectedBaselineReleaseId: null,
      selectedBaselineTitle: null,
      attemptedBaselineReleaseIds: [],
      reaction: null,
      blockers: ['luminate-current-the-winning-observation-missing'],
    },
  });
  const result = evaluateIuLuminateProductionReviewGate({
    manifest: manifest(),
    storedRead: read,
  });
  assert.equal(result.state, 'blocked');
  assert.equal(result.normalizationDataState, 'current-observation-missing');
  assert.equal(result.relativeChange, null);
  assert.ok(result.blockers.includes('iu-luminate-review-normalization-data-unavailable'));
});

test('territory mismatch between manifest and stored resolution is blocked', () => {
  const read = storedRead({
    resolution: {
      ...storedRead().resolution,
      territory: 'CA',
    },
  });
  const result = evaluateIuLuminateProductionReviewGate({
    manifest: manifest(),
    storedRead: read,
  });
  assert.equal(result.state, 'blocked');
  assert.ok(result.blockers.includes('iu-luminate-review-stored-territory-mismatch'));
});
