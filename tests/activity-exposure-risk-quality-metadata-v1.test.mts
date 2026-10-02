import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildActivityExposureRiskQualityMetadata,
  ACTIVITY_EXPOSURE_RISK_QUALITY_METADATA_CONTRACT_VERSION,
} from '../lib/product/adapters/activityExposureRiskQualityMetadata';
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
      events: Object.freeze([...(input.events ?? [])]),
      providerCoverage: Object.freeze([...(input.coverage ?? covered)]),
      dataOrigin: 'observed' as const,
      publication: 'production' as const,
      presentation: 'standard' as const,
    }),
  });
}

test('producer exposes typed availability and coverage but keeps unresolved dimensions explicit', () => {
  const result = buildActivityExposureRiskQualityMetadata(okResult());
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  const metadata = result.metadata;
  assert.equal(
    metadata.contractVersion,
    ACTIVITY_EXPOSURE_RISK_QUALITY_METADATA_CONTRACT_VERSION,
  );
  assert.equal(metadata.variableId, 'comebackActivityPoint');
  assert.equal(metadata.constructId, 'activityExposure');
  assert.equal(metadata.lifecycleState, 'production');
  assert.equal(metadata.materialClass, 'real');
  assert.equal(metadata.confidenceContractVersion, 'fandex-confidence-v1');
  assert.equal(metadata.confidencePolicy, 'conservative-floor-v1');
  assert.equal(metadata.availabilityState, 'available');
  assert.equal(metadata.coverageState, 'complete');
  assert.equal(metadata.identityState, 'resolved');
  assert.equal(metadata.confidenceState, 'insufficient');
  assert.equal(metadata.freshnessState, 'unknown');
  assert.equal(metadata.conflictState, 'unknown');
  assert.equal(metadata.revisionState, 'unknown');
  assert.equal(metadata.historyState, 'unknown');
});

test('every required semantic is explicit and state-bound', () => {
  const result = buildActivityExposureRiskQualityMetadata(
    okResult({ events: Object.freeze([event()]) }),
  );
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  const metadata = result.metadata;
  const expected = {
    availability: metadata.availabilityState,
    identity: metadata.identityState,
    confidence: metadata.confidenceState,
    coverage: metadata.coverageState,
    freshness: metadata.freshnessState,
    conflict: metadata.conflictState,
    revision: metadata.revisionState,
    history: metadata.historyState,
  };

  for (const [dimension, stateValue] of Object.entries(expected)) {
    const semantic =
      metadata.requiredDimensionSemantics[
        dimension as keyof typeof metadata.requiredDimensionSemantics
      ];
    assert.equal(semantic.stateValue, stateValue);
    assert.equal(semantic.evidenceRefs.length > 0, true);
    assert.equal(
      semantic.semanticVersion,
      ACTIVITY_EXPOSURE_RISK_QUALITY_METADATA_CONTRACT_VERSION,
    );
  }

  assert.ok(
    metadata.evidenceRefs.includes(
      'activity-exposure-event:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    ),
  );
});

test('provider unavailable remains distinct from source missing', () => {
  const result = buildActivityExposureRiskQualityMetadata(
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

  assert.equal(result.metadata.availabilityState, 'provider-unavailable');
  assert.equal(result.metadata.coverageState, 'incomplete');
});

test('missing source data and unsupported scope remain distinct', () => {
  const missing = buildActivityExposureRiskQualityMetadata(
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
  const unsupported = buildActivityExposureRiskQualityMetadata(
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

  assert.equal(missing.status, 'ok');
  assert.equal(unsupported.status, 'ok');
  if (missing.status !== 'ok' || unsupported.status !== 'ok') return;

  assert.equal(missing.metadata.availabilityState, 'source-missing');
  assert.equal(unsupported.metadata.availabilityState, 'unsupported');
});

test('identity unresolved remains explicit', () => {
  const result = buildActivityExposureRiskQualityMetadata(
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
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.metadata.identityState, 'unresolved');
});

test('revision lineage is evidence but not promoted to revision stability', () => {
  const result = buildActivityExposureRiskQualityMetadata(
    okResult({
      events: Object.freeze([
        event({
          revisionId: 'rev-2',
          supersedesRevisionId: 'rev-1',
        }),
      ]),
    }),
  );
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.metadata.revisionState, 'unknown');
  assert.equal(
    result.metadata.requiredDimensionSemantics.revision.reason,
    'revision-lineage-not-revision-stability',
  );
});

test('free-form conflict text is not promoted to typed conflict quality', () => {
  const result = buildActivityExposureRiskQualityMetadata(
    okResult({
      events: Object.freeze([
        event({ conflictState: 'provider-text-conflict' }),
      ]),
    }),
  );
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.metadata.conflictState, 'unknown');
});

test('invalid provider coverage blocks the producer quality contract', () => {
  const result = buildActivityExposureRiskQualityMetadata(
    okResult({
      coverage: Object.freeze([
        covered[0],
        Object.freeze({
          ...covered[1],
          collectionStatus: 'invalid' as const,
          coverageState: 'invalid' as const,
        }),
      ]),
    }),
  );

  assert.deepEqual(result, {
    status: 'blocked',
    reason: 'upstream-quality-state-invalid',
  });
});

test('non-production material is blocked', () => {
  const base = okResult();
  if (base.status !== 'ok') return;

  assert.deepEqual(
    buildActivityExposureRiskQualityMetadata({
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

test('producer metadata remains nonnumeric', () => {
  const result = buildActivityExposureRiskQualityMetadata(okResult());
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal('score' in result.metadata, false);
  assert.equal('weight' in result.metadata, false);
  assert.equal('penalty' in result.metadata, false);
});
