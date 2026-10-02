import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ProductActivityExposureEvent,
  ProductActivityExposureProviderCoverage,
} from '../lib/product/contracts/productActivityExposure';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../lib/product/contracts/productActivityExposurePublicRoute';
import {
  assessRiskAdjustmentDependency,
  deriveRiskAdjustmentAssessment,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  projectActivityExposureForRiskAdjustment,
} from '../lib/intelligence/riskAdjustmentActivityExposureProjection';

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

test('fully covered empty event stream is available, never numeric true zero', () => {
  const projected = projectActivityExposureForRiskAdjustment(okResult());
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.equal(projected.input.variableId, 'comebackActivityPoint');
  assert.equal(projected.input.lifecycleState, 'production');
  assert.equal(projected.input.materialClass, 'real');
  assert.equal(projected.input.availabilityState, 'available');
  assert.equal(projected.input.coverageState, 'complete');
  assert.equal(projected.input.identityState, 'resolved');

  const dependency = assessRiskAdjustmentDependency(projected.input);
  assert.equal(dependency.trueZeroObserved, false);
  assert.equal(dependency.qualityIssues.includes('source-missing'), false);

  const assessment = deriveRiskAdjustmentAssessment([projected.input]);
  assert.equal(assessment.status, 'insufficient_data');
  assert.equal(assessment.numericEligible, false);
  assert.equal(assessment.score, null);
});

test('provider unavailable remains distinct from source missing', () => {
  const projected = projectActivityExposureForRiskAdjustment(
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
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.equal(projected.input.availabilityState, 'provider-unavailable');
  assert.equal(projected.input.coverageState, 'incomplete');
  const dependency = assessRiskAdjustmentDependency(projected.input);
  assert.ok(dependency.qualityIssues.includes('provider-unavailable'));
  assert.equal(dependency.qualityIssues.includes('source-missing'), false);
});

test('not-in-scope is unsupported rather than missing', () => {
  const projected = projectActivityExposureForRiskAdjustment(
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
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.equal(projected.input.availabilityState, 'unsupported');
  assert.equal(projected.input.coverageState, 'incomplete');
  const dependency = assessRiskAdjustmentDependency(projected.input);
  assert.ok(dependency.qualityIssues.includes('unsupported-scope'));
  assert.equal(dependency.qualityIssues.includes('source-missing'), false);
});

test('typed upstream identity-unresolved state remains identity-unresolved', () => {
  const projected = projectActivityExposureForRiskAdjustment(
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
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;
  assert.equal(projected.input.identityState, 'unresolved');
  assert.ok(
    assessRiskAdjustmentDependency(projected.input)
      .qualityIssues.includes('identity-unresolved'),
  );
});

test('revision lineage does not get promoted to revision stability', () => {
  const projected = projectActivityExposureForRiskAdjustment(
    okResult({
      events: Object.freeze([
        event({
          revisionId: 'rev-2',
          supersedesRevisionId: 'rev-1',
        }),
      ]),
    }),
  );
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.equal(projected.input.revisionState, 'unknown');
  assert.equal(projected.input.historyState, 'unknown');
  assert.equal(projected.input.freshnessState, 'unknown');
  assert.equal(projected.input.conflictState, 'unknown');
});

test('stored event lineage is retained as bounded Risk evidence refs', () => {
  const projected = projectActivityExposureForRiskAdjustment(
    okResult({ events: Object.freeze([event()]) }),
  );
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.deepEqual(projected.input.evidenceRefs, [
    'activity-exposure-event:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  ]);
});

test('invalid upstream coverage fails closed instead of becoming missing', () => {
  const projected = projectActivityExposureForRiskAdjustment(
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

  assert.deepEqual(projected, {
    status: 'blocked',
    contractVersion: 'risk-adjustment-activity-exposure-projection-v1',
    reason: 'upstream-quality-state-invalid',
  });
});

test('upstream data issue is blocked and never converted to missing or zero', () => {
  const projected = projectActivityExposureForRiskAdjustment({
    status: 'data-issue',
    reason: 'runtime-read-failed',
  });
  assert.deepEqual(projected, {
    status: 'blocked',
    contractVersion: 'risk-adjustment-activity-exposure-projection-v1',
    reason: 'upstream-read-not-ok',
  });
});
