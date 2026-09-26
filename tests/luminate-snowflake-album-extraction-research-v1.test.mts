import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aggregateLuminateSnowflakeFirstWeekRows,
  buildLuminateObservationSnapshotFromSnowflakeAggregate,
  buildLuminateReleaseGroupDiscoveryPlan,
  buildLuminateSnowflakeBreakoutEvidence,
  buildLuminateSnowflakeFirstWeekExtractionPlan,
  LUMINATE_SNOWFLAKE_ALBUM_EXTRACTION_RESEARCH_DESCRIPTOR,
} from '../lib/alternative-evidence/luminateSnowflakeAlbumExtractionResearch';
import { IU_PIECES_RELEASE_FAMILY_ID, IU_PIECES_RELEASE_ID } from '../lib/alternative-evidence/iuPiecesResearchEvidence';
import { IU_THE_WINNING_RELEASE_FAMILY_ID, IU_THE_WINNING_RELEASE_ID } from '../lib/alternative-evidence/iuTheWinningResearchEvidence';

const breakouts = buildLuminateSnowflakeBreakoutEvidence({
  metricCategoryProductSales: 'provider-value:ProductSales',
  distributionChannelPhysical: 'provider-value:Physical',
  purchaseMethodOnline: 'provider-value:Online',
  purchaseMethodStorefront: 'provider-value:Storefront',
  physicalProductFormats: ['CD', 'Vinyl'],
});

test('descriptor uses album-level detail view and reported quantity only', () => {
  const descriptor = LUMINATE_SNOWFLAKE_ALBUM_EXTRACTION_RESEARCH_DESCRIPTOR;
  assert.equal(descriptor.factView, 'VW_DAILY_FACT_MRELG_DETAIL_DS');
  assert.equal(descriptor.primaryQuantityField, 'REPORTED_QUANTITY');
  assert.deepEqual(descriptor.modeledQuantityFieldsForbidden, ['QUANTITY', 'EQUIVALENT_QUANTITY']);
  assert.deepEqual(descriptor.transactionTypesIncluded, ['S', 'R']);
  assert.deepEqual(descriptor.transactionTypesExcluded, ['CMA']);
  assert.equal(descriptor.liveConnectionImplemented, false);
});

test('Pieces discovery can cross-check barcode while The Winning remains provider-ID review required', () => {
  const pieces = buildLuminateReleaseGroupDiscoveryPlan({
    fandexReleaseId: IU_PIECES_RELEASE_ID,
    canonicalTitle: 'Pieces',
    artistDisplayName: 'IU',
    releaseDate: '2021-12-29',
    barcode: '8804775236938',
  });
  assert.equal(pieces.state, 'provider-id-resolution-required');
  assert.match(pieces.exactMetadataCandidateQueryTemplate, /VW_MUSICAL_RELEASE_GROUP_DS/);
  assert.match(pieces.barcodeMappingQueryTemplate ?? '', /VW_MREL_MRELG_MAP_DS/);
  assert.equal(pieces.acceptanceRule, 'exactly-one-reviewed-mrelg-candidate-with-barcode-crosscheck-required');

  const winning = buildLuminateReleaseGroupDiscoveryPlan({
    fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
    canonicalTitle: 'The Winning',
    artistDisplayName: 'IU',
    releaseDate: '2024-02-20',
    barcode: null,
  });
  assert.equal(winning.barcodeMappingQueryTemplate, null);
  assert.equal(winning.acceptanceRule, 'exactly-one-reviewed-mrelg-candidate-required');
});

test('first-week query is parameterized and excludes CMA and modeled quantity fields', () => {
  const plan = buildLuminateSnowflakeFirstWeekExtractionPlan({
    mrelgId: 'luminate:test:mrelg:the-winning',
    territory: 'US',
    releaseDate: '2024-02-20',
    breakouts,
  });
  assert.equal(plan.state, 'ready-after-license-and-provider-id-resolution');
  assert.equal(plan.providerPeriod, '2024-02-20/2024-02-26');
  assert.match(plan.queryTemplate, /SUM\(REPORTED_QUANTITY\)/);
  assert.match(plan.queryTemplate, /TRANSACTION_TYPE IN \('S', 'R'\)/);
  assert.ok(!/SUM\(QUANTITY\)/.test(plan.queryTemplate));
  assert.ok(!/EQUIVALENT_QUANTITY/.test(plan.queryTemplate));
  assert.deepEqual(plan.bindValues.transactionTypes, ['S', 'R']);
});

test('aggregate sums all S/R reported activity in the first-week lane and preserves modified-at', () => {
  const aggregate = aggregateLuminateSnowflakeFirstWeekRows({
    mrelgId: 'luminate:test:mrelg:pieces',
    territory: 'US',
    releaseDate: '2021-12-29',
    allowedPhysicalProductFormats: ['CD', 'Vinyl'],
    rows: [
      {
        MRELG_ID: 'luminate:test:mrelg:pieces',
        COUNTRY_CODE: 'US',
        PRODUCT_FORMAT: 'CD',
        TRANSACTION_TYPE: 'S',
        REPORT_DATE: '2021-12-29',
        REPORTED_QUANTITY: 120,
        MODIFIED_AT: '2022-01-01T00:00:00.000Z',
      },
      {
        MRELG_ID: 'luminate:test:mrelg:pieces',
        COUNTRY_CODE: 'US',
        PRODUCT_FORMAT: 'CD',
        TRANSACTION_TYPE: 'R',
        REPORT_DATE: '2021-12-30',
        REPORTED_QUANTITY: -5,
        MODIFIED_AT: '2022-01-02T00:00:00.000Z',
      },
      {
        MRELG_ID: 'luminate:test:mrelg:pieces',
        COUNTRY_CODE: 'US',
        PRODUCT_FORMAT: 'Vinyl',
        TRANSACTION_TYPE: 'S',
        REPORT_DATE: '2022-01-04',
        REPORTED_QUANTITY: 85,
        MODIFIED_AT: '2022-01-05T00:00:00.000Z',
      },
    ],
  });
  assert.equal(aggregate.reportedPhysicalUnits, 200);
  assert.equal(aggregate.providerPeriod, '2021-12-29/2022-01-04');
  assert.equal(aggregate.maxModifiedAt, '2022-01-05T00:00:00.000Z');
  assert.deepEqual(aggregate.productFormats, ['CD', 'Vinyl']);
});

test('rows outside the release-relative first-week or outside the physical-format set fail closed', () => {
  assert.throws(() => aggregateLuminateSnowflakeFirstWeekRows({
    mrelgId: 'luminate:test:mrelg:pieces',
    territory: 'US',
    releaseDate: '2021-12-29',
    allowedPhysicalProductFormats: ['CD'],
    rows: [{
      MRELG_ID: 'luminate:test:mrelg:pieces',
      COUNTRY_CODE: 'US',
      PRODUCT_FORMAT: 'Vinyl',
      TRANSACTION_TYPE: 'S',
      REPORT_DATE: '2022-01-05',
      REPORTED_QUANTITY: 10,
      MODIFIED_AT: '2022-01-05T00:00:00.000Z',
    }],
  }), /product_format_unapproved|report_date_outside_first_week/);
});

test('aggregate becomes an original direct observation and later changed rowset becomes a revision', () => {
  const originalAggregate = aggregateLuminateSnowflakeFirstWeekRows({
    mrelgId: 'luminate:test:mrelg:pieces',
    territory: 'US',
    releaseDate: '2021-12-29',
    allowedPhysicalProductFormats: ['CD'],
    rows: [{
      MRELG_ID: 'luminate:test:mrelg:pieces',
      COUNTRY_CODE: 'US',
      PRODUCT_FORMAT: 'CD',
      TRANSACTION_TYPE: 'S',
      REPORT_DATE: '2021-12-29',
      REPORTED_QUANTITY: 200,
      MODIFIED_AT: '2022-01-01T00:00:00.000Z',
    }],
  });
  const original = buildLuminateObservationSnapshotFromSnowflakeAggregate({
    aggregate: originalAggregate,
    fandexArtistId: 'iu',
    fandexReleaseId: IU_PIECES_RELEASE_ID,
    fandexReleaseFamilyId: IU_PIECES_RELEASE_FAMILY_ID,
    providerArtistId: 'luminate:test:artist:iu',
    collectedAt: '2026-09-18T02:00:00.000Z',
  });
  assert.equal(original.state, 'new-original');
  assert.equal(original.observation?.value, 200);
  assert.equal(original.observation?.format, 'physical');
  assert.equal(original.observation?.supersedesObservationId, null);

  const revisedAggregate = aggregateLuminateSnowflakeFirstWeekRows({
    mrelgId: 'luminate:test:mrelg:pieces',
    territory: 'US',
    releaseDate: '2021-12-29',
    allowedPhysicalProductFormats: ['CD'],
    rows: [{
      MRELG_ID: 'luminate:test:mrelg:pieces',
      COUNTRY_CODE: 'US',
      PRODUCT_FORMAT: 'CD',
      TRANSACTION_TYPE: 'S',
      REPORT_DATE: '2021-12-29',
      REPORTED_QUANTITY: 210,
      MODIFIED_AT: '2026-09-18T01:00:00.000Z',
    }],
  });
  const revision = buildLuminateObservationSnapshotFromSnowflakeAggregate({
    aggregate: revisedAggregate,
    fandexArtistId: 'iu',
    fandexReleaseId: IU_PIECES_RELEASE_ID,
    fandexReleaseFamilyId: IU_PIECES_RELEASE_FAMILY_ID,
    providerArtistId: 'luminate:test:artist:iu',
    collectedAt: '2026-09-18T02:30:00.000Z',
    predecessor: {
      observationId: original.observation!.observationId,
      storedRecordId: 'a'.repeat(64),
      sourceRowsDigest: originalAggregate.sourceRowsDigest,
    },
  });
  assert.equal(revision.state, 'new-revision');
  assert.equal(revision.observation?.value, 210);
  assert.equal(revision.observation?.supersedesObservationId, original.observation?.observationId);
  assert.equal(revision.supersedesStoredRecordId, 'a'.repeat(64));
  assert.equal(revision.observation?.revisionObservedAt, '2026-09-18T01:00:00.000Z');

  const unchanged = buildLuminateObservationSnapshotFromSnowflakeAggregate({
    aggregate: originalAggregate,
    fandexArtistId: 'iu',
    fandexReleaseId: IU_PIECES_RELEASE_ID,
    fandexReleaseFamilyId: IU_PIECES_RELEASE_FAMILY_ID,
    providerArtistId: 'luminate:test:artist:iu',
    collectedAt: '2026-09-18T03:00:00.000Z',
    predecessor: {
      observationId: original.observation!.observationId,
      storedRecordId: 'a'.repeat(64),
      sourceRowsDigest: originalAggregate.sourceRowsDigest,
    },
  });
  assert.equal(unchanged.state, 'unchanged-noop');
  assert.equal(unchanged.observation, null);
});

test('The Winning identities remain independent from Pieces during observation construction', () => {
  const aggregate = aggregateLuminateSnowflakeFirstWeekRows({
    mrelgId: 'luminate:test:mrelg:the-winning',
    territory: 'US',
    releaseDate: '2024-02-20',
    allowedPhysicalProductFormats: ['CD'],
    rows: [{
      MRELG_ID: 'luminate:test:mrelg:the-winning',
      COUNTRY_CODE: 'US',
      PRODUCT_FORMAT: 'CD',
      TRANSACTION_TYPE: 'S',
      REPORT_DATE: '2024-02-20',
      REPORTED_QUANTITY: 300,
      MODIFIED_AT: '2024-02-27T00:00:00.000Z',
    }],
  });
  const built = buildLuminateObservationSnapshotFromSnowflakeAggregate({
    aggregate,
    fandexArtistId: 'iu',
    fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
    fandexReleaseFamilyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
    providerArtistId: 'luminate:test:artist:iu',
    collectedAt: '2026-09-18T04:00:00.000Z',
  });
  assert.equal(built.observation?.fandexReleaseId, IU_THE_WINNING_RELEASE_ID);
  assert.equal(built.observation?.providerReleaseId, 'luminate:test:mrelg:the-winning');
});
