import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveRiskAdjustmentAssessment,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  projectActivityExposureForRiskAdjustment,
} from '../lib/intelligence/riskAdjustmentActivityExposureProjection';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../lib/product/contracts/productActivityExposurePublicRoute';

const eventRecordId = 'a'.repeat(64);
const observationId = 'b'.repeat(64);

function result(
  overrides: Partial<
    Extract<ProductActivityExposurePublicRouteResult, { status: 'ok' }>['model']
  > = {},
): ProductActivityExposurePublicRouteResult {
  return {
    status: 'ok',
    model: {
      contractVersion: 'product-activity-exposure-v1',
      identity: {
        sourceArtistId: 'iu',
        constructId: 'activityExposure',
      },
      construct: 'Activity Exposure Event Stream',
      events: [],
      providerCoverage: [
        {
          provider: 'musicbrainz',
          providerArtistId: 'provider-iu',
          collectionStatus: 'succeeded',
          coverageState: 'covered',
          collectedAt: '2026-09-30T00:00:00.000Z',
        },
        {
          provider: 'youtube',
          providerArtistId: 'UC3SyT4_WLHzN7JmHQwKQZww',
          collectionStatus: 'succeeded',
          coverageState: 'covered',
          collectedAt: '2026-09-30T00:00:00.000Z',
        },
      ],
      dataOrigin: 'observed',
      publication: 'production',
      presentation: 'standard',
      ...overrides,
    },
  };
}

function observedEvent() {
  return {
    artistId: 'iu',
    eventId: 'activity:youtube:video:JleoAppaxi0',
    eventFamily: 'official_content' as const,
    eventType: 'official_video_publication' as const,
    lifecycleState: 'observed' as const,
    participationScope: 'solo' as const,
    announcedAt: null,
    scheduledStartAt: null,
    scheduledEndAt: null,
    occurredAt: '2024-01-23T15:00:00Z',
    occurredAtPrecision: 'timestamp' as const,
    sourcePublishedAt: '2024-01-23T15:00:00Z',
    collectedAt: '2026-09-30T00:00:00.000Z',
    sourceProvider: 'youtube' as const,
    sourceEntityType: 'video' as const,
    sourceEntityId: 'JleoAppaxi0',
    canonicalFamilyId: null,
    providerArtistId: 'UC3SyT4_WLHzN7JmHQwKQZww',
    providerArtistCredits: [
      {
        providerArtistId: 'UC3SyT4_WLHzN7JmHQwKQZww',
        creditedName: null,
        canonicalProviderName: null,
      },
    ],
    evidenceRef: 'https://www.youtube.com/watch?v=JleoAppaxi0',
    identityState: 'resolved',
    missingState: 'covered' as const,
    evidenceState: 'direct_provider_evidence',
    conflictState: 'clear',
    timeZoneState: 'provider_iso8601_timestamp',
    revisionId: 'collection:2026-09-30T00:00:00.000Z',
    supersedesRevisionId: null,
    storedEvidenceTrace: {
      eventRecordId,
      sourceObservationId: observationId,
    },
  };
}

test('complete categorical coverage with no event is not converted to zero', () => {
  const projected = projectActivityExposureForRiskAdjustment(result());
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.equal(
    projected.input.availabilityState,
    'categorical-covered-no-event',
  );
  assert.equal(projected.input.coverageState, 'complete');
  assert.equal(projected.input.identityState, 'resolved');
  assert.equal(projected.input.conflictState, 'none');

  const assessment = deriveRiskAdjustmentAssessment([projected.input]);
  assert.deepEqual(
    assessment.categoricalNoEventVariables,
    ['comebackActivityPoint'],
  );
  assert.deepEqual(assessment.trueZeroVariables, []);
  assert.equal(
    assessment.qualityIssues.includes('source-missing'),
    false,
  );
});

test('observed events remain categorical evidence rather than a numeric value', () => {
  const projected = projectActivityExposureForRiskAdjustment(
    result({ events: [observedEvent()] }),
  );
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.equal(
    projected.input.availabilityState,
    'categorical-evidence-present',
  );
  assert.deepEqual(projected.input.evidenceRefs, [
    'activity-event:' + eventRecordId,
    'activity-observation:' + observationId,
  ]);

  const assessment = deriveRiskAdjustmentAssessment([projected.input]);
  assert.equal(assessment.numericEligible, false);
  assert.equal(assessment.score, null);
});

test('bounded partial provider coverage remains incomplete', () => {
  const base = result();
  if (base.status !== 'ok') return;

  const projected = projectActivityExposureForRiskAdjustment(
    result({
      providerCoverage: [
        base.model.providerCoverage[0],
        {
          ...base.model.providerCoverage[1],
          collectionStatus: 'bounded_partial',
          coverageState: 'partial',
        },
      ],
    }),
  );
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.equal(projected.input.coverageState, 'incomplete');
  assert.equal(
    projected.input.availabilityState,
    'upstream-unavailable-ambiguous',
  );

  const assessment = deriveRiskAdjustmentAssessment([projected.input]);
  assert.equal(
    assessment.qualityIssues.includes('incomplete-coverage'),
    true,
  );
  assert.equal(
    assessment.qualityIssues.includes('availability-unresolved'),
    true,
  );
});

test('provider unavailable remains explicitly provider unavailable', () => {
  const base = result();
  if (base.status !== 'ok') return;

  const projected = projectActivityExposureForRiskAdjustment(
    result({
      providerCoverage: [
        base.model.providerCoverage[0],
        {
          ...base.model.providerCoverage[1],
          collectionStatus: 'provider_unavailable',
          coverageState: 'provider_unavailable',
        },
      ],
    }),
  );
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.equal(projected.input.availabilityState, 'provider-unavailable');
  assert.equal(projected.input.coverageState, 'incomplete');
});

test('explicit event conflict maps to conflict without inventing a penalty', () => {
  const event = {
    ...observedEvent(),
    conflictState: 'detected',
  };
  const projected = projectActivityExposureForRiskAdjustment(
    result({ events: [event] }),
  );
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  assert.equal(projected.input.conflictState, 'detected');
  const assessment = deriveRiskAdjustmentAssessment([projected.input]);
  assert.equal(assessment.qualityIssues.includes('data-conflict'), true);
  assert.equal(assessment.penalty, null);
});

test('shadow Activity Exposure cannot enter Risk Production input', () => {
  assert.deepEqual(
    projectActivityExposureForRiskAdjustment(
      result({ publication: 'shadow' }),
    ),
    {
      status: 'blocked',
      contractVersion: 'risk-adjustment-activity-exposure-projection-v1',
      reason: 'upstream-not-real-production',
    },
  );
});

test('provider coverage must contain the two Product-required providers', () => {
  const base = result();
  if (base.status !== 'ok') return;

  assert.deepEqual(
    projectActivityExposureForRiskAdjustment(
      result({ providerCoverage: [base.model.providerCoverage[0]] }),
    ),
    {
      status: 'blocked',
      contractVersion: 'risk-adjustment-activity-exposure-projection-v1',
      reason: 'upstream-provider-coverage-invalid',
    },
  );
});

test('Activity Exposure can contribute quality facts but remains insufficient without confidence/freshness/history semantics', () => {
  const projected = projectActivityExposureForRiskAdjustment(
    result({ events: [observedEvent()] }),
  );
  assert.equal(projected.status, 'ok');
  if (projected.status !== 'ok') return;

  const assessment = deriveRiskAdjustmentAssessment([projected.input]);
  assert.equal(assessment.status, 'insufficient_data');
  assert.deepEqual(assessment.qualityIssues, [
    'confidence-insufficient',
    'freshness-unknown',
    'history-unknown',
    'revision-state-unknown',
    'volatility-unknown',
  ]);
});
