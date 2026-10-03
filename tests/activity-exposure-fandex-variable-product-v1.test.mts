import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptActivityExposureToFandexVariableProduct,
  ACTIVITY_EXPOSURE_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/activityExposureFandexVariableProduct';
import type {
  ProductActivityExposureEvent,
  ProductActivityExposureProviderCoverage,
} from '../lib/product/contracts/productActivityExposure';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../lib/product/contracts/productActivityExposurePublicRoute';

const covered: readonly ProductActivityExposureProviderCoverage[] = Object.freeze([
  Object.freeze({
    provider: 'musicbrainz' as const,
    providerArtistId: 'iu-mb',
    collectionStatus: 'succeeded' as const,
    coverageState: 'covered' as const,
    collectedAt: '2026-09-30T00:00:00.000Z',
  }),
  Object.freeze({
    provider: 'youtube' as const,
    providerArtistId: 'iu-yt',
    collectionStatus: 'succeeded' as const,
    coverageState: 'covered' as const,
    collectedAt: '2026-09-30T00:00:00.000Z',
  }),
]);

function event(
  overrides: Partial<ProductActivityExposureEvent> = {},
): ProductActivityExposureEvent {
  return Object.freeze({
    artistId: 'iu',
    eventId: 'event-1',
    eventFamily: 'release',
    eventType: 'confirmed_release',
    lifecycleState: 'observed',
    participationScope: 'solo',
    announcedAt: null,
    scheduledStartAt: null,
    scheduledEndAt: null,
    occurredAt: '2026-09-30',
    occurredAtPrecision: 'day',
    sourcePublishedAt: '2026-09-30T00:00:00.000Z',
    collectedAt: '2026-09-30T01:00:00.000Z',
    sourceProvider: 'musicbrainz',
    sourceEntityType: 'release-group',
    sourceEntityId: 'rg-1',
    canonicalFamilyId: null,
    providerArtistId: 'iu-mb',
    providerArtistCredits: Object.freeze([
      Object.freeze({
        providerArtistId: 'iu-mb',
        creditedName: 'IU',
        canonicalProviderName: 'IU',
      }),
    ]),
    evidenceRef: 'evidence:event-1',
    identityState: 'resolved',
    missingState: 'covered',
    evidenceState: 'observed',
    conflictState: 'none',
    timeZoneState: 'not-applicable',
    revisionId: 'rev-1',
    supersedesRevisionId: null,
    storedEvidenceTrace: Object.freeze({
      eventRecordId:
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      sourceObservationId:
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    }),
    ...overrides,
  });
}

function okResult(input: Readonly<{
  coverage?: readonly ProductActivityExposureProviderCoverage[];
  events?: readonly ProductActivityExposureEvent[];
}> = {}): ProductActivityExposurePublicRouteResult {
  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      contractVersion: 'product-activity-exposure-v1' as const,
      identity: Object.freeze({
        sourceArtistId: 'iu',
        constructId: 'activityExposure' as const,
      }),
      construct: 'Activity Exposure Event Stream' as const,
      events: Object.freeze([...(input.events ?? [event()])]),
      providerCoverage: Object.freeze([...(input.coverage ?? covered)]),
      dataOrigin: 'observed' as const,
      publication: 'production' as const,
      presentation: 'standard' as const,
    }),
  });
}

test('real production activity exposure maps into the common event Product record', () => {
  const result = adaptActivityExposureToFandexVariableProduct(okResult());

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.variableId, 'comebackActivityPoint');
  assert.equal(result.record.canonicalArtistId, 'iu');
  assert.equal(result.record.lifecycleState, 'production');
  assert.equal(result.record.materialClass, 'real');
  assert.equal(result.record.readinessState, 'production');
  assert.equal(result.record.availability, 'available');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'event',
    state: 'Activity Exposure Event Stream',
  });
  assert.equal(result.record.confidence, 'insufficient');
  assert.equal(result.record.coverage, 'complete');
  assert.equal(result.record.freshness, 'unknown');
  assert.deepEqual(result.record.observationTime, { kind: 'unknown' });
  assert.equal(
    result.record.productVersion,
    ACTIVITY_EXPOSURE_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  );
});

test('missing source coverage remains missing rather than zero or available', () => {
  const result = adaptActivityExposureToFandexVariableProduct(
    okResult({
      coverage: Object.freeze([
        covered[0],
        Object.freeze({
          ...covered[1],
          coverageState: 'missing_source_data' as const,
        }),
      ]),
    }),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.availability, 'missing');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'event',
    state: null,
  });
  assert.equal(result.record.missingReason, 'source-missing');
});

test('unsupported provider scope remains unsupported', () => {
  const result = adaptActivityExposureToFandexVariableProduct(
    okResult({
      coverage: Object.freeze([
        covered[0],
        Object.freeze({
          ...covered[1],
          coverageState: 'not_in_scope' as const,
        }),
      ]),
    }),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.availability, 'unsupported');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'none',
    reason: 'unsupported',
  });
  assert.equal(
    result.record.unsupportedReason,
    'provider-scope-unsupported',
  );
});

test('provider unavailable remains unavailable rather than missing', () => {
  const result = adaptActivityExposureToFandexVariableProduct(
    okResult({
      coverage: Object.freeze([
        covered[0],
        Object.freeze({
          ...covered[1],
          collectionStatus: 'provider_unavailable' as const,
          coverageState: 'provider_unavailable' as const,
        }),
      ]),
    }),
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.availability, 'unavailable');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'none',
    reason: 'not-produced',
  });
  assert.equal(result.record.missingReason, null);
});

test('unresolved event identity fails closed instead of emitting an apparently production-ready common record', () => {
  const result = adaptActivityExposureToFandexVariableProduct(
    okResult({
      events: Object.freeze([
        event({
          lifecycleState: 'planned',
          occurredAt: null,
          occurredAtPrecision: null,
          missingState: 'identity_unresolved',
        }),
      ]),
    }),
  );

  assert.deepEqual(result, {
    status: 'blocked',
    reason: 'upstream-identity-unresolved',
  });
});

test('shadow or non-real upstream truth fails closed', () => {
  const base = okResult();
  if (base.status !== 'ok') return;

  assert.deepEqual(
    adaptActivityExposureToFandexVariableProduct({
      ...base,
      model: {
        ...base.model,
        publication: 'shadow',
      },
    }),
    {
      status: 'blocked',
      reason: 'upstream-not-real-production',
    },
  );
});

test('evidence refs preserve existing producer quality lineage without inventing aggregate methodology', () => {
  const result = adaptActivityExposureToFandexVariableProduct(okResult());

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.ok(
    result.record.evidenceRefs.includes(
      'activity-exposure-event:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      'contract:activity-exposure-risk-quality-metadata-v1',
    ),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      'product-contract:product-activity-exposure-v1',
    ),
  );
  assert.equal(result.record.asOf, null);
  assert.deepEqual(result.record.observationTime, { kind: 'unknown' });
});
