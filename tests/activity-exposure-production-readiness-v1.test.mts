import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateActivityExposureProductionReadiness,
} from '../lib/product/activation/activityExposureProductionReadiness';
import type {
  ProductActivityExposureReadModelResult,
} from '../lib/product/contracts/productActivityExposure';

function result(): ProductActivityExposureReadModelResult {
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
          eventId:
            'activity:musicbrainz:release-group:1299e16d-133b-47b0-b991-36cf11eff7d7',
          eventFamily: 'release' as const,
          eventType: 'confirmed_release' as const,
          lifecycleState: 'observed' as const,
          participationScope: 'solo' as const,
          announcedAt: null,
          scheduledStartAt: null,
          scheduledEndAt: null,
          occurredAt: '2024-01-01',
          occurredAtPrecision: 'day' as const,
          sourcePublishedAt: null,
          collectedAt: '2026-09-25T00:00:00.000Z',
          sourceProvider: 'musicbrainz' as const,
          sourceEntityType: 'release-group' as const,
          sourceEntityId: '1299e16d-133b-47b0-b991-36cf11eff7d7',
          canonicalFamilyId: '1299e16d-133b-47b0-b991-36cf11eff7d7',
          providerArtistId: 'b9545342-1e6d-4dae-84ac-013374ad8d7c',
          providerArtistCredits: Object.freeze([
            Object.freeze({
              providerArtistId:
                'b9545342-1e6d-4dae-84ac-013374ad8d7c',
              creditedName: 'IU',
              canonicalProviderName: 'IU',
            }),
          ]),
          evidenceRef:
            'https://musicbrainz.org/release-group/1299e16d-133b-47b0-b991-36cf11eff7d7',
          identityState: 'resolved',
          missingState: 'covered' as const,
          evidenceState:
            'direct_provider_evidence_with_official_release_support',
          conflictState: 'clear',
          timeZoneState: 'provider_date',
          revisionId: 'event-revision:' + 'c'.repeat(64),
          supersedesRevisionId: null,
          storedEvidenceTrace: Object.freeze({
            eventRecordId: 'e'.repeat(64),
            sourceObservationId: 'a'.repeat(64),
          }),
        }),
      ]),
      providerCoverage: Object.freeze([
        Object.freeze({
          provider: 'musicbrainz' as const,
          providerArtistId: 'b9545342-1e6d-4dae-84ac-013374ad8d7c',
          collectionStatus: 'bounded_partial' as const,
          coverageState: 'partial' as const,
          collectedAt: '2026-09-25T00:00:00.000Z',
        }),
        Object.freeze({
          provider: 'youtube' as const,
          providerArtistId: 'UC3SyT4_WLHzN7JmHQwKQZww',
          collectionStatus: 'succeeded' as const,
          coverageState: 'covered' as const,
          collectedAt: '2026-09-25T00:00:00.000Z',
        }),
      ]),
      dataOrigin: 'observed' as const,
      publication: 'shadow' as const,
      presentation: 'standard' as const,
    }),
  });
}

test('IU Activity Exposure is ready only for activation authorization, not activated', () => {
  const readiness = evaluateActivityExposureProductionReadiness(result());

  assert.equal(readiness.status, 'ready-for-activation-authorization');
  assert.deepEqual(readiness.target, {
    artistId: 'iu',
    legacyVariableId: 'comebackActivityPoint',
    constructId: 'activityExposure',
  });
  assert.equal(Object.values(readiness.checks).every(Boolean), true);
  assert.equal(readiness.eventCount, 1);
  assert.equal(readiness.providerCount, 2);
  assert.equal('activationAuthorized' in readiness, false);
  assert.equal('publicRouteActivated' in readiness, false);
});

test('missing Stored Evidence trace blocks activation readiness', () => {
  const valid = result();
  if (valid.status !== 'ok') throw new Error('fixture_invalid');
  const withoutTrace: ProductActivityExposureReadModelResult = {
    status: 'ok',
    model: {
      ...valid.model,
      events: valid.model.events.map(({ storedEvidenceTrace: _trace, ...event }) =>
        Object.freeze(event),
      ),
    },
  };

  const readiness =
    evaluateActivityExposureProductionReadiness(withoutTrace);

  assert.equal(readiness.status, 'blocked');
  assert.equal(readiness.checks['stored-evidence-trace'], false);
});

test('provider unavailability blocks readiness without converting it to zero/inactive', () => {
  const valid = result();
  if (valid.status !== 'ok') throw new Error('fixture_invalid');
  const unavailable: ProductActivityExposureReadModelResult = {
    status: 'ok',
    model: {
      ...valid.model,
      providerCoverage: valid.model.providerCoverage.map((coverage) =>
        coverage.provider === 'youtube'
          ? Object.freeze({
              ...coverage,
              collectionStatus: 'provider_unavailable' as const,
              coverageState: 'provider_unavailable' as const,
            })
          : coverage,
      ),
    },
  };

  const readiness = evaluateActivityExposureProductionReadiness(unavailable);

  assert.equal(readiness.status, 'blocked');
  assert.equal(readiness.checks['provider-availability'], false);
  assert.equal('value' in readiness, false);
  assert.equal('inactive' in readiness, false);
});

test('numeric fact injection blocks the non-numeric contract', () => {
  const valid = result();
  if (valid.status !== 'ok') throw new Error('fixture_invalid');
  const injected = {
    status: 'ok' as const,
    model: {
      ...valid.model,
      fact: { availability: 'available', value: 100 },
    },
  } as unknown as ProductActivityExposureReadModelResult;

  const readiness = evaluateActivityExposureProductionReadiness(injected);

  assert.equal(readiness.status, 'blocked');
  assert.equal(readiness.checks['non-numeric-contract'], false);
});

test('data issue is blocked without inventing event/provider counts', () => {
  const readiness = evaluateActivityExposureProductionReadiness({
    status: 'data-issue',
    issues: [
      {
        code: 'missing-provider-coverage',
        provider: 'youtube',
      },
    ],
  });

  assert.equal(readiness.status, 'blocked');
  assert.equal(readiness.eventCount, null);
  assert.equal(readiness.providerCount, null);
  assert.equal(Object.values(readiness.checks).some(Boolean), false);
});
