import assert from 'node:assert/strict';
import test from 'node:test';
import {
  adaptCircleRetailQualifiedResponse,
  CIRCLE_RETAIL_ADAPTER,
  CircleRetailLiveGateError,
  validateCircleRetailNormalizedObservations,
} from '../lib/alternative-evidence/circleRetailAdapter';
import {
  buildCircleRetailDiscoveryRequestPlan,
  captureCircleRetailDiscovery,
  verifyCircleRetailCandidateEndpoint,
  verifyCircleRetailQuantitySemantic,
} from '../lib/alternative-evidence/circleRetailDiscovery';
import { CIRCLE_PROVIDER_DESCRIPTOR } from '../lib/alternative-evidence/directAlbumProvider';

const observedAt = '2026-08-31T15:55:44.000Z';
const collectedAt = '2026-08-31T15:55:45.000Z';

const rawDaily = {
  FormToMap: { termGbn: 'day', yyyymmdd: '20260529' },
  ResultStatus: 'OK',
  List: {
    0: {
      Album: 'LEMONADE - The 2nd Album',
      Artist: 'aespa',
      Barcode: '8804775469824',
      rowSum: '321155',
      KSum: '1',
      ESum: '2',
      RankInt: '1',
      RankOrder: '1',
      YYYYMMDD: '20260529',
      sys_date: '2026-06-02 14:40:46.587 +0000 UTC',
    },
    1: {
      Album: 'Unresolved Album',
      Artist: 'Unresolved Artist',
      Barcode: '8800000000002',
      rowSum: '1234',
      KSum: '1000',
      ESum: '234',
      RankInt: '2',
      RankOrder: '2',
      YYYYMMDD: '20260529',
    },
  },
};

function qualifiedListCapture(
  rawResponse: unknown,
  termGbn: 'day' | 'week' | 'month' | 'year' = 'day',
  yyyymmdd = '20260529',
) {
  const plan = verifyCircleRetailCandidateEndpoint(
    buildCircleRetailDiscoveryRequestPlan({
      timeframe: termGbn,
      date: termGbn === 'day' ? '2026-05-29' : null,
      providerPeriodKey: yyyymmdd,
      candidate: {
        kind: 'retail-list',
        params: { termGbn, yyyymmdd },
      },
    }),
    ['circle-official-page-request-contract'],
  );
  return verifyCircleRetailQuantitySemantic(
    captureCircleRetailDiscovery({
      plan,
      rawResponse,
      status: 200,
      contentType: 'application/json',
      observedAt,
    }),
    {
      quantitySemanticState: 'verified-retail-copies',
      quantityField: 'rowSum',
      rowPath: '$.List{values}',
      evidenceIds: ['circle-official-render-sales-rowSum'],
    },
  );
}

function qualifiedHourCapture(rawResponse: unknown) {
  const params = {
    yyyymmdd: '20260831',
    HourRange: '0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23',
    ListType: '전일22시',
    thisHour: '23',
  };
  const plan = verifyCircleRetailCandidateEndpoint(
    buildCircleRetailDiscoveryRequestPlan({
      timeframe: 'hour',
      date: '2026-08-31',
      hour: 23,
      providerPeriodKey: '20260831-23',
      candidate: { kind: 'retail-hour', params },
    }),
    ['circle-retail-hour-direct-v1'],
  );
  return verifyCircleRetailQuantitySemantic(
    captureCircleRetailDiscovery({
      plan,
      rawResponse,
      status: 200,
      contentType: 'application/json',
      observedAt,
    }),
    {
      quantitySemanticState: 'verified-retail-copies',
      quantityField: 'rowSum',
      rowPath: '$.List{values}',
      evidenceIds: ['circle-retail-hour-rowSum-sales'],
    },
  );
}

const resolvedIdentity = {
  fandexArtistId: 'artist:aespa',
  fandexReleaseId: 'release:aespa:lemonade-2',
  fandexReleaseFamilyId: 'release-family:aespa:lemonade',
  artistResolutionState: 'resolved' as const,
  artistReviewState: 'human-reviewed' as const,
  releaseResolutionState: 'resolved' as const,
  releaseReviewState: 'human-reviewed' as const,
  evidenceIds: ['identity-review:aespa:lemonade'],
};

test('qualified Circle row becomes a direct period-sale observation using rowSum only', () => {
  const capture = qualifiedListCapture(rawDaily);
  const result = adaptCircleRetailQualifiedResponse({
    capture,
    rawResponse: rawDaily,
    collectedAt,
    syntheticFixture: true,
    resolveIdentity: (row) => row.Barcode === '8804775469824' ? resolvedIdentity : null,
  });

  assert.equal(result.providerId, 'circle-chart');
  assert.equal(result.timeframe, 'day');
  assert.equal(result.providerPeriod, 'day:20260529');
  assert.equal(result.liveEligible, false);
  assert.equal(result.featureBridgeEligible, false);
  assert.equal(result.observations.length, 1);
  assert.equal(result.rejections.length, 1);

  const observation = result.observations[0];
  assert.equal(observation.semantic, 'period-sale');
  assert.equal(observation.unit, 'physical-units');
  assert.equal(observation.value, 321155);
  assert.notEqual(observation.value, 3);
  assert.equal(observation.providerSkuId, '8804775469824');
  assert.equal(observation.providerObservationId, null);
  assert.equal(observation.providerArtistId, null);
  assert.equal(observation.providerReleaseId, null);
  assert.equal(observation.fandexArtistId, 'artist:aespa');
  assert.equal(observation.fandexReleaseId, 'release:aespa:lemonade-2');
  assert.equal(observation.territory, null);
  assert.equal(observation.format, null);
  assert.equal(observation.providerPublishedAt, null);
  assert.equal(observation.scopeRole, 'standalone');

  assert.deepEqual(result.rejections[0].reasons, [
    'artist-identity-unresolved',
    'release-identity-unresolved',
    'identity-evidence-missing',
  ]);
});

test('evidence-linked descriptor validates real period-sale observations while base descriptor remains unknown', () => {
  const capture = qualifiedListCapture(rawDaily);
  const research = adaptCircleRetailQualifiedResponse({
    capture,
    rawResponse: rawDaily,
    collectedAt,
    syntheticFixture: false,
    resolveIdentity: (row) => row.Barcode === '8804775469824' ? resolvedIdentity : null,
  });

  assert.deepEqual(validateCircleRetailNormalizedObservations(research.observations), {
    valid: true,
    issues: [],
  });

  const baseValidation = validateCircleRetailNormalizedObservations(
    research.observations,
    CIRCLE_PROVIDER_DESCRIPTOR,
  );
  assert.equal(baseValidation.valid, false);
  assert.ok(baseValidation.issues.includes('capability-supportsNativePeriodSales-unknown'));

  assert.equal(CIRCLE_RETAIL_ADAPTER.descriptor.capabilities.supportsNativePeriodSales.state, 'true');
  assert.equal(CIRCLE_RETAIL_ADAPTER.descriptor.defaultOff.liveCallsAllowed, false);
  assert.equal(CIRCLE_RETAIL_ADAPTER.descriptor.defaultOff.productionAllowed, false);
});

test('payload digest mismatch fails closed', () => {
  const capture = qualifiedListCapture(rawDaily);
  const changed = {
    ...rawDaily,
    List: {
      ...rawDaily.List,
      0: { ...rawDaily.List[0], rowSum: '321156' },
    },
  };
  assert.throws(() => adaptCircleRetailQualifiedResponse({
    capture,
    rawResponse: changed,
    collectedAt,
    resolveIdentity: () => resolvedIdentity,
  }), /circle_retail_adapter_payload_digest_mismatch/);
});

test('negative quantity is rejected and never coerced to zero', () => {
  const invalid = {
    ...rawDaily,
    List: {
      0: { ...rawDaily.List[0], rowSum: '-1' },
    },
  };
  const capture = qualifiedListCapture(invalid);
  const result = adaptCircleRetailQualifiedResponse({
    capture,
    rawResponse: invalid,
    collectedAt,
    syntheticFixture: true,
    resolveIdentity: () => resolvedIdentity,
  });
  assert.equal(result.observations.length, 0);
  assert.equal(result.rejections.length, 1);
  assert.ok(result.rejections[0].reasons.includes('quantity-invalid'));
});

test('provider-period mismatch is rejected', () => {
  const mismatch = {
    ...rawDaily,
    List: {
      0: { ...rawDaily.List[0], YYYYMMDD: '20260528' },
    },
  };
  const capture = qualifiedListCapture(mismatch);
  const result = adaptCircleRetailQualifiedResponse({
    capture,
    rawResponse: mismatch,
    collectedAt,
    syntheticFixture: true,
    resolveIdentity: () => resolvedIdentity,
  });
  assert.equal(result.observations.length, 0);
  assert.ok(result.rejections[0].reasons.includes('provider-period-mismatch'));
});

test('monthly rows preserve provider-native month period without ISO rewriting', () => {
  const rawMonthly = {
    FormToMap: { termGbn: 'month', yyyymmdd: '202206' },
    ResultStatus: 'OK',
    List: {
      0: {
        Album: 'Proof',
        Artist: '방탄소년단',
        Barcode: '8809848751103',
        rowSum: '1899573',
        KSum: '936247',
        ESum: '963326',
        RankInt: '1',
        RankOrder: '1',
        YYYYMM: '202206',
      },
    },
  };
  const capture = qualifiedListCapture(rawMonthly, 'month', '202206');
  const result = adaptCircleRetailQualifiedResponse({
    capture,
    rawResponse: rawMonthly,
    collectedAt,
    syntheticFixture: true,
    resolveIdentity: () => ({
      fandexArtistId: 'artist:bts',
      fandexReleaseId: 'release:bts:proof',
      fandexReleaseFamilyId: 'release-family:bts:proof',
      artistResolutionState: 'resolved',
      artistReviewState: 'provider-verified',
      releaseResolutionState: 'resolved',
      releaseReviewState: 'provider-verified',
      evidenceIds: ['identity-review:bts:proof'],
    }),
  });
  assert.equal(result.providerPeriod, 'month:202206');
  assert.equal(result.observations[0].value, 1899573);
  assert.equal(result.observations[0].providerSkuId, '8809848751103');
});

test('yearly retail_list rows are qualified with provider-native YYYY and Barcode', () => {
  const rawYear = {
    FormToMap: { termGbn: 'year', yyyymmdd: '2025' },
    ResultStatus: 'OK',
    List: {
      0: {
        Album: 'KARMA',
        Artist: 'Stray Kids (스트레이 키즈)',
        Barcode: '8809954227851',
        rowSum: '1095914',
        KSum: '900000',
        ESum: '195914',
        RankInt: '1',
        RankOrder: '1',
        YYYY: '2025',
      },
    },
  };
  const capture = qualifiedListCapture(rawYear, 'year', '2025');
  const result = adaptCircleRetailQualifiedResponse({
    capture,
    rawResponse: rawYear,
    collectedAt,
    syntheticFixture: false,
    resolveIdentity: () => ({
      fandexArtistId: 'artist:stray-kids',
      fandexReleaseId: 'release:stray-kids:karma',
      fandexReleaseFamilyId: 'release-family:stray-kids:karma',
      artistResolutionState: 'resolved',
      artistReviewState: 'human-reviewed',
      releaseResolutionState: 'resolved',
      releaseReviewState: 'human-reviewed',
      evidenceIds: ['identity-review:stray-kids:karma'],
    }),
  });
  assert.equal(result.timeframe, 'year');
  assert.equal(result.providerPeriod, 'year:2025');
  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].value, 1095914);
  assert.equal(result.observations[0].providerSkuId, '8809954227851');
  assert.equal(validateCircleRetailNormalizedObservations(result.observations).valid, true);
});

test('hourly retail_hour rows are qualified without inventing missing Barcode identity', () => {
  const rawHour = {
    FormToMap: {
      yyyymmdd: '20260831',
      HourRange: '0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23',
      ListType: '전일22시',
      thisHour: '23',
    },
    ResultStatus: 'OK',
    List: {
      0: {
        Album: 'GREENGREEN',
        Artist: 'CORTIS (코르티스)',
        rowSum: '21261',
        KSum: '18842',
        ESum: '2419',
        RankInt: '1',
        RankStatus: 'new',
        YYYYMMDD: '20260831',
      },
    },
  };
  const capture = qualifiedHourCapture(rawHour);
  const result = adaptCircleRetailQualifiedResponse({
    capture,
    rawResponse: rawHour,
    collectedAt,
    syntheticFixture: false,
    resolveIdentity: () => ({
      fandexArtistId: 'artist:cortis',
      fandexReleaseId: 'release:cortis:greengreen',
      fandexReleaseFamilyId: 'release-family:cortis:greengreen',
      artistResolutionState: 'resolved',
      artistReviewState: 'human-reviewed',
      releaseResolutionState: 'resolved',
      releaseReviewState: 'human-reviewed',
      evidenceIds: ['identity-review:cortis:greengreen'],
    }),
  });
  assert.equal(result.timeframe, 'hour');
  assert.equal(result.providerPeriod, 'hour:20260831-23');
  assert.equal(result.observations.length, 1);
  assert.equal(result.observations[0].value, 21261);
  assert.equal(result.observations[0].providerSkuId, null);
  assert.equal(validateCircleRetailNormalizedObservations(result.observations).valid, true);
});

test('non-hour periods still reject missing Barcode instead of silently weakening SKU identity', () => {
  const noBarcode = {
    ...rawDaily,
    List: {
      0: {
        ...rawDaily.List[0],
        Barcode: undefined,
      },
    },
  };
  const capture = qualifiedListCapture(noBarcode);
  const result = adaptCircleRetailQualifiedResponse({
    capture,
    rawResponse: noBarcode,
    collectedAt,
    syntheticFixture: true,
    resolveIdentity: () => resolvedIdentity,
  });
  assert.equal(result.observations.length, 0);
  assert.ok(result.rejections[0].reasons.includes('sku-identity-missing'));
});

test('live execution stays disabled', async () => {
  await assert.rejects(() => CIRCLE_RETAIL_ADAPTER.executeLive(), (error: unknown) => {
    assert.ok(error instanceof CircleRetailLiveGateError);
    assert.equal(error.code, 'circle-retail-live-calls-disabled');
    return true;
  });
});
