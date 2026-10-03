import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildActivityExposureRiskQualityMetadata,
} from '../lib/product/adapters/activityExposureRiskQualityMetadata';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../lib/product/contracts/productActivityExposurePublicRoute';
import {
  adaptRiskAdjustmentProducerQualityMetadata,
} from '../lib/intelligence/riskAdjustmentProducerMetadataAdapter';
import {
  assembleRiskAdjustmentFromQualityEnvelopes,
} from '../lib/intelligence/riskAdjustmentQualityEnvelopeAssembly';
import {
  deriveRiskAdjustmentQualitySufficiencyWitness,
} from '../lib/intelligence/riskAdjustmentQualitySufficiencyWitness';

function productionResult(): ProductActivityExposurePublicRouteResult {
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

test('current-main Activity Exposure producer is accepted by the Risk producer adapter', () => {
  const producer =
    buildActivityExposureRiskQualityMetadata(productionResult());

  assert.equal(producer.status, 'ok');
  if (producer.status !== 'ok') return;

  const adapted =
    adaptRiskAdjustmentProducerQualityMetadata(producer.metadata);

  assert.equal(adapted.status, 'ok');
  if (adapted.status !== 'ok') return;

  assert.equal(
    adapted.envelope.variableId,
    'comebackActivityPoint',
  );
  assert.equal(
    adapted.envelope.producerContractVersion,
    'activity-exposure-risk-quality-metadata-v1',
  );
  assert.equal(adapted.assessment.status, 'accepted');
  assert.equal(
    adapted.assessment.handoff.acceptedForRiskConsumption,
    true,
  );
  assert.equal(adapted.envelope.input.coverageState, 'complete');
});

test('current-main Activity Exposure is consumable but remains insufficient-data', () => {
  const producer =
    buildActivityExposureRiskQualityMetadata(productionResult());

  assert.equal(producer.status, 'ok');
  if (producer.status !== 'ok') return;

  const adapted =
    adaptRiskAdjustmentProducerQualityMetadata(producer.metadata);
  assert.equal(adapted.status, 'ok');
  if (adapted.status !== 'ok') return;

  const assembly = assembleRiskAdjustmentFromQualityEnvelopes({
    artistId: 'iu',
    envelopes: [adapted.envelope],
  });

  assert.deepEqual(
    assembly.productDependencyAssembly.consumedVariableIds,
    ['comebackActivityPoint'],
  );
  assert.deepEqual(
    assembly.productDependencyAssembly.blockedVariableIds,
    [],
  );

  const product =
    assembly.productDependencyAssembly.productCandidate;
  assert.equal(product.readinessState, 'insufficient-data');
  assert.equal(product.assessment.status, 'insufficient_data');
  assert.equal(product.numericEligible, false);
  assert.equal(product.score, null);
  assert.equal(product.penalty, null);
  assert.equal(product.weight, null);
  assert.equal(product.activationAuthorized, false);
  assert.equal(product.publicationAuthorized, false);
  assert.equal(product.publicRouteAuthorized, false);

  assert.deepEqual(
    product.assessment.qualityIssues,
    [
      'confidence-insufficient',
      'conflict-unknown',
      'freshness-unknown',
      'history-unknown',
      'revision-state-unknown',
      'volatility-unknown',
    ],
  );

  const witness = deriveRiskAdjustmentQualitySufficiencyWitness([
    adapted.envelope.input,
  ]);
  assert.equal(witness.status, 'quality-sufficiency-blocked');
  assert.equal(witness.unresolvedOwnerCount, 1);
  assert.deepEqual(witness.unresolvedRequiredDimensions, [
    'confidence',
    'conflict',
    'freshness',
    'history',
    'revision',
  ]);
  assert.deepEqual(
    witness.entries[0]?.ownerScope,
    'activity-exposure-product-owner',
  );
  assert.deepEqual(witness.entries[0]?.nonBlockingQualityIssues, [
    'volatility-unknown',
  ]);
});
