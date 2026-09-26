import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION,
} from '../lib/product/activation/activityExposurePublicRouteCutoverExecution';
import type {
  ProductActivityExposureReadModelResult,
} from '../lib/product/contracts/productActivityExposure';
import {
  getActivityExposurePublicRoute,
} from '../lib/product/queries/getActivityExposurePublicRoute';

function validSource(): ProductActivityExposureReadModelResult {
  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      contractVersion: 'product-activity-exposure-v1' as const,
      identity: Object.freeze({
        sourceArtistId: 'iu',
        constructId: 'activityExposure' as const,
      }),
      construct: 'Activity Exposure Event Stream' as const,
      events: Object.freeze([
        Object.freeze({
          artistId: 'iu',
          eventId: 'activity:musicbrainz:release-group:test',
          eventFamily: 'release' as const,
          eventType: 'confirmed_release' as const,
          lifecycleState: 'observed' as const,
          participationScope: 'solo' as const,
          announcedAt: null,
          scheduledStartAt: null,
          scheduledEndAt: null,
          occurredAt: '2026-09-01',
          occurredAtPrecision: 'day' as const,
          sourcePublishedAt: null,
          collectedAt: '2026-09-26T00:00:00.000Z',
          sourceProvider: 'musicbrainz' as const,
          sourceEntityType: 'release-group' as const,
          sourceEntityId: 'test',
          canonicalFamilyId: null,
          providerArtistId: 'iu-mb',
          providerArtistCredits: Object.freeze([
            Object.freeze({
              providerArtistId: 'iu-mb',
              creditedName: 'IU',
              canonicalProviderName: 'IU',
            }),
          ]),
          evidenceRef: 'musicbrainz:test',
          identityState: 'resolved',
          missingState: 'covered' as const,
          evidenceState: 'stored',
          conflictState: 'none',
          timeZoneState: 'not-applicable',
          revisionId: 'revision:test',
          supersedesRevisionId: null,
          storedEvidenceTrace: Object.freeze({
            eventRecordId:
              'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            sourceObservationId:
              'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          }),
        }),
      ]),
      providerCoverage: Object.freeze([
        Object.freeze({
          provider: 'musicbrainz' as const,
          providerArtistId: 'iu-mb',
          collectionStatus: 'succeeded' as const,
          coverageState: 'covered' as const,
          collectedAt: '2026-09-26T00:00:00.000Z',
        }),
        Object.freeze({
          provider: 'youtube' as const,
          providerArtistId: 'iu-youtube',
          collectionStatus: 'succeeded' as const,
          coverageState: 'covered' as const,
          collectedAt: '2026-09-26T00:00:00.000Z',
        }),
      ]),
      dataOrigin: 'observed' as const,
      publication: 'shadow' as const,
      presentation: 'standard' as const,
    }),
  });
}

test('execution authorization is exact-bound to owner evidence and main', () => {
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION
      .cutoverExecutionAuthorizationId,
    'ops-cutover-execution-activity-exposure-20260926t033503z-v1',
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION.authorizedAt,
    '2026-09-26T03:35:03.000Z',
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION
      .authorizationEvidenceCommentId,
    5842819597,
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION.authorizedMain,
    'defc8f3a61328a80192b5380ad95ab7fc7d8be5b',
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION
      .binding.cutoverAuthorizationId,
    'ops-cutover-activity-exposure-20260926t025517z-v1',
  );
});

test('guarded public route publishes the event stream without numeric coercion', async () => {
  const result = await getActivityExposurePublicRoute({
    readActivityExposureReal: async () => validSource(),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.model.publication, 'production');
  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.construct, 'Activity Exposure Event Stream');
  assert.equal(result.model.events.length, 1);
  assert.equal(result.model.events[0].storedEvidenceTrace?.eventRecordId.length, 64);
  assert.equal('score' in result.model.events[0], false);
  assert.equal('value' in result.model.events[0], false);
  assert.equal('fact' in result.model.events[0], false);
});

test('runtime failure fails closed instead of falling back', async () => {
  const result = await getActivityExposurePublicRoute({
    readActivityExposureReal: async () => {
      throw new Error('database_unavailable');
    },
  });

  assert.deepEqual(result, {
    status: 'data-issue',
    reason: 'runtime-read-failed',
  });
});

test('missing Stored Evidence trace blocks publication', async () => {
  const source = validSource();
  assert.equal(source.status, 'ok');
  if (source.status !== 'ok') return;

  const event = source.model.events[0];
  const { storedEvidenceTrace: _trace, ...withoutTrace } = event;
  const result = await getActivityExposurePublicRoute({
    readActivityExposureReal: async () => Object.freeze({
      status: 'ok' as const,
      model: Object.freeze({
        ...source.model,
        events: Object.freeze([Object.freeze(withoutTrace)]),
      }),
    }),
  });

  assert.deepEqual(result, {
    status: 'data-issue',
    reason: 'stored-evidence-trace-missing',
  });
});

test('execution decision promotes only publication/lifecycle, not methodology', () => {
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION
      .decision.publicRouteActivated,
    true,
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION.decision.publication,
    'production',
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION
      .decision.directProductionContributionEligible,
    true,
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION.binding.claimScope,
    'event-stream-only-no-numeric-score',
  );
});
