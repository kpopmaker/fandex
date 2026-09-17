import assert from 'node:assert/strict';
import test from 'node:test';

import {
  IU_LUMINATE_LICENSED_BOOTSTRAP_COMMAND_RESEARCH_DESCRIPTOR,
  parseIuLuminateLicensedBootstrapArgs,
  runIuLuminateLicensedBootstrapReview,
} from '../lib/alternative-evidence/iuLuminateLicensedBootstrapCommandResearch';

function readyInput() {
  return {
    grant: {
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
    },
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
    breakouts: {
      metricCategoryProductSales: 'licensed:ProductSales',
      distributionChannelPhysical: 'licensed:Physical',
      purchaseMethodOnline: 'licensed:Online',
      purchaseMethodStorefront: 'licensed:Storefront',
      physicalProductFormats: ['CD', 'Vinyl'],
    },
    currentIdentityCandidate: {
      fandexReleaseId: 'research:iu:release:the-winning:2024-02-20',
      fandexReleaseFamilyId: 'research:iu:release-family:the-winning',
      canonicalTitle: 'The Winning',
      releaseDate: '2024-02-20',
      mrelgId: 'licensed:mrelg:the-winning',
      luminateTitle: 'The Winning',
      luminateDisplayArtist: 'IU',
      luminateReleaseDate: '2024-02-20',
      matchedBarcodes: ['8804775368752', '8804775368769'],
      reviewed: true,
    },
    baselineIdentityCandidate: {
      fandexReleaseId: 'research:iu:release:pieces:2021-12-29',
      fandexReleaseFamilyId: 'research:iu:release-family:pieces',
      canonicalTitle: 'Pieces',
      releaseDate: '2021-12-29',
      mrelgId: 'licensed:mrelg:pieces',
      luminateTitle: 'Pieces',
      luminateDisplayArtist: 'IU',
      luminateReleaseDate: '2021-12-29',
      matchedBarcodes: ['8804775236938'],
      reviewed: true,
    },
  };
}

test('command is local review-only with no network/database effects or credential acceptance', () => {
  const descriptor = IU_LUMINATE_LICENSED_BOOTSTRAP_COMMAND_RESEARCH_DESCRIPTOR;
  assert.equal(descriptor.lifecycle, 'research');
  assert.equal(descriptor.networkCalls, 0);
  assert.equal(descriptor.databaseReads, 0);
  assert.equal(descriptor.databaseWrites, 0);
  assert.equal(descriptor.credentialsAccepted, false);
  assert.equal(descriptor.secretsAccepted, false);
  assert.equal(descriptor.productionActivationPerformed, false);
  assert.equal(descriptor.productPublicationPerformed, false);
});

test('args accept exactly --input path', () => {
  assert.deepEqual(parseIuLuminateLicensedBootstrapArgs(['--input', 'manifest.json']), {
    inputPath: 'manifest.json',
  });
  assert.throws(
    () => parseIuLuminateLicensedBootstrapArgs(['--apply', '--input', 'manifest.json']),
    /argument_invalid/,
  );
});

test('ready raw input is rebuilt into exactly two extraction plans', async () => {
  const summary = await runIuLuminateLicensedBootstrapReview(
    ['--input', 'manifest.json'],
    { readFileText: async () => JSON.stringify(readyInput()) },
  );

  assert.equal(summary.status, 'ready-for-licensed-extraction-review');
  assert.equal(summary.territory, 'US');
  assert.match(summary.manifestDigest, /^[0-9a-f]{64}$/);
  assert.equal(summary.currentExtractionPlan?.mrelgId, 'licensed:mrelg:the-winning');
  assert.equal(summary.currentExtractionPlan?.providerPeriod, '2024-02-20/2024-02-26');
  assert.equal(summary.baselineExtractionPlan?.mrelgId, 'licensed:mrelg:pieces');
  assert.equal(summary.baselineExtractionPlan?.providerPeriod, '2021-12-29/2022-01-04');
  assert.deepEqual(summary.blockers, []);
});

test('credential-like keys are rejected before bootstrap evaluation', async () => {
  const input = {
    ...readyInput(),
    access: {
      ...readyInput().access,
      privateKey: 'must-not-be-accepted',
    },
  };

  await assert.rejects(
    () => runIuLuminateLicensedBootstrapReview(
      ['--input', 'manifest.json'],
      { readFileText: async () => JSON.stringify(input) },
    ),
    /credential_field_forbidden/,
  );
});

test('caller cannot bypass provider identity review by adding pre-resolved identity state', async () => {
  const input = {
    ...readyInput(),
    currentIdentity: {
      state: 'resolved-research',
      mrelgId: 'fake:bypass',
    },
    currentIdentityCandidate: {
      ...readyInput().currentIdentityCandidate,
      reviewed: false,
    },
  };

  const summary = await runIuLuminateLicensedBootstrapReview(
    ['--input', 'manifest.json'],
    { readFileText: async () => JSON.stringify(input) },
  );
  assert.equal(summary.status, 'blocked');
  assert.ok(summary.blockers.includes('iu-luminate-current-mrelg-unresolved'));
  assert.equal(summary.currentExtractionPlan, null);
});

test('caller-provided breakout evidence digest is ignored and recomputed from raw breakout values', async () => {
  const input = {
    ...readyInput(),
    breakouts: {
      ...readyInput().breakouts,
      evidenceDigest: '0'.repeat(64),
    },
  };

  const summary = await runIuLuminateLicensedBootstrapReview(
    ['--input', 'manifest.json'],
    { readFileText: async () => JSON.stringify(input) },
  );
  assert.equal(summary.status, 'ready-for-licensed-extraction-review');
  assert.match(summary.manifestDigest, /^[0-9a-f]{64}$/);
});

test('invalid JSON fails closed', async () => {
  await assert.rejects(
    () => runIuLuminateLicensedBootstrapReview(
      ['--input', 'manifest.json'],
      { readFileText: async () => '{not-json' },
    ),
    /input_invalid/,
  );
});
