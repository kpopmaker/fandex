import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildNewsIssuePointRiskQualityMetadata,
} from '../lib/product/adapters/newsIssuePointRiskQualityMetadata';
import {
  buildActivityExposureRiskQualityMetadata,
} from '../lib/product/adapters/activityExposureRiskQualityMetadata';
import type {
  ProductVariableReadModelResult,
} from '../lib/product/contracts/productVariable';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../lib/product/contracts/productActivityExposurePublicRoute';
import {
  adaptRiskAdjustmentProducerQualityMetadata,
} from '../lib/intelligence/riskAdjustmentProducerMetadataAdapter';
import type {
  RiskAdjustmentUpstreamQualityEnvelope,
} from '../lib/intelligence/riskAdjustmentUpstreamQualityEnvelope';
import {
  assembleRiskAdjustmentFromQualityEnvelopes,
} from '../lib/intelligence/riskAdjustmentQualityEnvelopeAssembly';
import {
  createRiskAdjustmentDerivationReadinessWitness,
} from '../lib/intelligence/riskAdjustmentDerivationReadinessWitness';

function newsResult(): ProductVariableReadModelResult {
  return {
    status: 'ok',
    model: {
      identity: {
        sourceArtistId: 'iu',
        variableId: 'newsIssuePoint',
        sourceVariableKey: 'newsIssuePoint',
      },
      definition: {
        variableId: 'newsIssuePoint',
        sourceKey: 'newsIssuePoint',
        displayName: '뉴스/이슈',
        description: 'integration',
        relatedSourceMetricKeys: [],
        evidenceRelation: {
          kind: 'legacy-issue-signal-key',
          sourceKey: 'newsIssuePoint',
        },
      },
      fact: { availability: 'available', value: 42 },
      series: [],
      observationTime: {
        kind: 'period',
        start: '2026-09-30T00:00:00.000Z',
        end: '2026-09-30T07:00:00.000Z',
      },
      presentation: 'standard',
      dataOrigin: 'observed',
      publication: 'production',
      sourceMetadata: {
        sourceKind: 'naver-news-issue-point-frozen-methodology',
        sourceArtistId: 'iu',
        sourceVariableKey: 'newsIssuePoint',
        sourceTimeLabel: '2026-09-30T07:00:00.000Z',
        methodologyVersion: 'v1_naver_news_issue_point_real_methodology',
        officialShadowEpoch: '2026-09-01T00:00:00.000Z',
        throughSlotStart: '2026-09-30T07:00:00.000Z',
        selectedWindowSlotCount: 8,
        normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
        baselineReadinessStatus: 'replicated_cycle_history',
        currentActivityRate: 0.5,
        priorDefinedWindowCount: 12,
        priorLessThanLatestCount: 5,
        priorEqualToLatestCount: 2,
        priorGreaterThanLatestCount: 5,
      },
      evidenceTrace: {
        kind: 'naver-news-issue-point-stored-evidence',
        methodologyVersion: 'v1_naver_news_issue_point_real_methodology',
        officialShadowEpoch: '2026-09-01T00:00:00.000Z',
        throughSlotStart: '2026-09-30T07:00:00.000Z',
        currentWindow: null,
        eligiblePriorWindows: [],
        storedEvidenceJobIds: ['job-b', 'job-a'],
      },
    },
  } as ProductVariableReadModelResult;
}

function activityResult(): ProductActivityExposurePublicRouteResult {
  return {
    status: 'ok',
    model: {
      contractVersion: 'product-activity-exposure-v1',
      identity: {
        sourceArtistId: 'iu',
        constructId: 'activityExposure',
      },
      construct: 'Activity Exposure Event Stream',
      events: [
        {
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
          providerArtistCredits: [
            {
              providerArtistId: 'iu-mb',
              creditedName: 'IU',
              canonicalProviderName: 'IU',
            },
          ],
          evidenceRef: 'evidence:event-1',
          identityState: 'resolved',
          missingState: 'covered',
          evidenceState: 'observed',
          conflictState: 'none',
          timeZoneState: 'not-applicable',
          revisionId: 'rev-1',
          supersedesRevisionId: null,
          storedEvidenceTrace: {
            eventRecordId:
              'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            sourceObservationId:
              'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          },
        },
      ],
      providerCoverage: [
        {
          provider: 'musicbrainz',
          providerArtistId: 'iu-mb',
          collectionStatus: 'succeeded',
          coverageState: 'covered',
          collectedAt: '2026-09-30T01:00:00.000Z',
        },
        {
          provider: 'youtube',
          providerArtistId: 'iu-yt',
          collectionStatus: 'succeeded',
          coverageState: 'covered',
          collectedAt: '2026-09-30T01:00:00.000Z',
        },
      ],
      dataOrigin: 'observed',
      publication: 'production',
      presentation: 'standard',
    },
  };
}

function newsEnvelope(): RiskAdjustmentUpstreamQualityEnvelope {
  const result = buildNewsIssuePointRiskQualityMetadata(newsResult());
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') throw new Error('news quality metadata blocked');

  const adapted =
    adaptRiskAdjustmentProducerQualityMetadata(result.metadata);
  assert.equal(adapted.status, 'ok');
  if (adapted.status !== 'ok') {
    throw new Error('news producer metadata adaptation blocked');
  }
  assert.equal(adapted.assessment.status, 'accepted');
  return adapted.envelope;
}

function activityEnvelope(): RiskAdjustmentUpstreamQualityEnvelope {
  const result = buildActivityExposureRiskQualityMetadata(activityResult());
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') {
    throw new Error('activity quality metadata blocked');
  }

  const adapted =
    adaptRiskAdjustmentProducerQualityMetadata(result.metadata);
  assert.equal(adapted.status, 'ok');
  if (adapted.status !== 'ok') {
    throw new Error('activity producer metadata adaptation blocked');
  }
  assert.equal(adapted.assessment.status, 'accepted');
  return adapted.envelope;
}

test('newsIssuePoint producer contract is structurally accepted by the Risk envelope', () => {
  const producer = buildNewsIssuePointRiskQualityMetadata(newsResult());
  assert.equal(producer.status, 'ok');
  if (producer.status !== 'ok') return;
  const adapted =
    adaptRiskAdjustmentProducerQualityMetadata(producer.metadata);
  assert.equal(adapted.status, 'ok');
  if (adapted.status !== 'ok') return;
  const assessment = adapted.assessment;

  assert.equal(assessment.status, 'accepted');
  if (assessment.status !== 'accepted') return;

  assert.equal(assessment.handoff.acceptedForRiskConsumption, true);
  assert.deepEqual(assessment.handoff.missingRequiredDimensions, []);
  assert.deepEqual(assessment.handoff.unknownRequiredDimensions, []);
  assert.equal(assessment.input.confidenceState, 'insufficient');
  assert.equal(assessment.input.coverageState, 'unknown');
  assert.equal(assessment.input.freshnessState, 'unknown');
  assert.equal(assessment.input.conflictState, 'unknown');
  assert.equal(assessment.input.revisionState, 'unknown');
});

test('Activity Exposure producer contract is structurally accepted by the Risk envelope', () => {
  const producer =
    buildActivityExposureRiskQualityMetadata(activityResult());
  assert.equal(producer.status, 'ok');
  if (producer.status !== 'ok') return;
  const adapted =
    adaptRiskAdjustmentProducerQualityMetadata(producer.metadata);
  assert.equal(adapted.status, 'ok');
  if (adapted.status !== 'ok') return;
  const assessment = adapted.assessment;

  assert.equal(assessment.status, 'accepted');
  if (assessment.status !== 'accepted') return;

  assert.equal(assessment.handoff.acceptedForRiskConsumption, true);
  assert.deepEqual(assessment.handoff.missingRequiredDimensions, []);
  assert.deepEqual(assessment.handoff.unknownRequiredDimensions, []);
  assert.equal(assessment.input.confidenceState, 'insufficient');
  assert.equal(assessment.input.coverageState, 'complete');
  assert.equal(assessment.input.freshnessState, 'unknown');
  assert.equal(assessment.input.conflictState, 'unknown');
  assert.equal(assessment.input.revisionState, 'unknown');
  assert.equal(assessment.input.historyState, 'unknown');
});

test('both explicit producer envelopes are consumed but Risk remains fail-closed insufficient-data', () => {
  const assembly = assembleRiskAdjustmentFromQualityEnvelopes({
    artistId: 'iu',
    envelopes: [newsEnvelope(), activityEnvelope()],
  });

  assert.deepEqual(
    assembly.envelopes.map((entry) => ({
      variableId: entry.variableId,
      envelopeStatus: entry.envelopeStatus,
      consumed: entry.consumed,
    })),
    [
      {
        variableId: 'comebackActivityPoint',
        envelopeStatus: 'accepted',
        consumed: true,
      },
      {
        variableId: 'newsIssuePoint',
        envelopeStatus: 'accepted',
        consumed: true,
      },
    ],
  );

  const product =
    assembly.productDependencyAssembly.productCandidate;

  assert.deepEqual(
    assembly.productDependencyAssembly.consumedVariableIds,
    ['comebackActivityPoint', 'newsIssuePoint'],
  );
  assert.deepEqual(
    assembly.productDependencyAssembly.blockedVariableIds,
    [],
  );
  assert.equal(product.readinessState, 'insufficient-data');
  assert.equal(product.assessment.status, 'insufficient_data');
  assert.equal(product.numericEligible, false);
  assert.equal(product.score, null);
  assert.equal(product.penalty, null);
  assert.equal(product.weight, null);
  assert.equal(product.activationAuthorized, false);
  assert.equal(product.publicationAuthorized, false);
  assert.equal(product.publicRouteAuthorized, false);

  assert.ok(
    product.assessment.qualityIssues.includes('confidence-insufficient'),
  );
  assert.ok(
    product.assessment.qualityIssues.includes('coverage-unknown'),
  );
  assert.ok(
    product.assessment.qualityIssues.includes('freshness-unknown'),
  );
  assert.ok(
    product.assessment.qualityIssues.includes('conflict-unknown'),
  );
  assert.ok(
    product.assessment.qualityIssues.includes('revision-state-unknown'),
  );
  assert.ok(
    product.assessment.qualityIssues.includes('history-unknown'),
  );
});

test('exact producers are all-consumable while derivation quality remains insufficient', () => {
  const newsProducer =
    buildNewsIssuePointRiskQualityMetadata(newsResult());
  const activityProducer =
    buildActivityExposureRiskQualityMetadata(activityResult());
  assert.equal(newsProducer.status, 'ok');
  assert.equal(activityProducer.status, 'ok');
  if (newsProducer.status !== 'ok' || activityProducer.status !== 'ok') {
    return;
  }

  const news =
    adaptRiskAdjustmentProducerQualityMetadata(newsProducer.metadata);
  const activity =
    adaptRiskAdjustmentProducerQualityMetadata(activityProducer.metadata);
  assert.equal(news.status, 'ok');
  assert.equal(activity.status, 'ok');
  if (news.status !== 'ok' || activity.status !== 'ok') return;
  assert.equal(news.assessment.status, 'accepted');
  assert.equal(activity.assessment.status, 'accepted');
  if (
    news.assessment.status !== 'accepted'
    || activity.assessment.status !== 'accepted'
  ) {
    return;
  }

  const witness = createRiskAdjustmentDerivationReadinessWitness({
    artistId: 'iu',
    dependencies: [
      {
        handoff: news.assessment.handoff,
        projectedInput: news.envelope.input,
      },
      {
        handoff: activity.assessment.handoff,
        projectedInput: activity.envelope.input,
      },
    ],
  });

  assert.equal(witness.integrationState, 'all-consumable');
  assert.equal(witness.acceptedQualityState, 'insufficient');
  assert.equal(witness.productReadinessState, 'insufficient-data');
  assert.deepEqual(witness.acceptedVariableIds, [
    'comebackActivityPoint',
    'newsIssuePoint',
  ]);
  assert.deepEqual(witness.metadataBlockedVariableIds, []);
  assert.deepEqual(witness.qualityInsufficientVariableIds, [
    'comebackActivityPoint',
    'newsIssuePoint',
  ]);
  assert.deepEqual(witness.categoricalReadyVariableIds, []);
  assert.equal(witness.numericEligible, false);
  assert.equal(witness.activationAuthorized, false);
});

test('explicit unknown semantics never become optimistic resolved quality through envelope assembly', () => {
  const newsProducer =
    buildNewsIssuePointRiskQualityMetadata(newsResult());
  const activityProducer =
    buildActivityExposureRiskQualityMetadata(activityResult());
  assert.equal(newsProducer.status, 'ok');
  assert.equal(activityProducer.status, 'ok');
  if (newsProducer.status !== 'ok' || activityProducer.status !== 'ok') {
    return;
  }

  const news =
    adaptRiskAdjustmentProducerQualityMetadata(newsProducer.metadata);
  const activity =
    adaptRiskAdjustmentProducerQualityMetadata(activityProducer.metadata);
  assert.equal(news.status, 'ok');
  assert.equal(activity.status, 'ok');
  if (news.status !== 'ok' || activity.status !== 'ok') return;

  assert.notEqual(news.envelope.input.freshnessState, 'current');
  assert.notEqual(news.envelope.input.conflictState, 'none');
  assert.notEqual(news.envelope.input.revisionState, 'stable');
  assert.notEqual(activity.envelope.input.freshnessState, 'current');
  assert.notEqual(activity.envelope.input.conflictState, 'none');
  assert.notEqual(activity.envelope.input.revisionState, 'stable');
});
