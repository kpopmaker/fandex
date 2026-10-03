import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDirectAlbumObservation,
} from '../lib/alternative-evidence/directAlbumProvider';
import {
  CIRCLE_EVIDENCE_DESCRIPTOR,
  HANTEO_EVIDENCE_DESCRIPTOR,
} from '../lib/alternative-evidence/directProviderEvidence';
import {
  buildAlbumNormalizationInput,
} from '../lib/product/contracts/albumNormalizationInput';
import {
  buildAlbumReleaseScopeReviewPacket,
  createReleaseScopeCompletenessEvidenceRecord,
} from '../lib/product/readiness/albumReleaseScopeReviewPacket';
import {
  reviewAlbumNormalizationCalibrationEvidence,
} from '../lib/product/readiness/albumNormalizationCalibrationEvidenceReview';

function circleObservation(input: Readonly<{
  sku: string | null;
  value: number;
  scopeRole?: 'standalone' | 'release-total' | 'child-sku';
  parentObservationId?: string | null;
}>) {
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: 'circle-chart',
    providerObservationId: null,
    providerArtistId: null,
    providerReleaseId: null,
    providerEditionId: null,
    providerSkuId: input.sku,
    fandexArtistId: 'iu',
    fandexReleaseId: 'iu-release-1',
    fandexReleaseFamilyId: 'iu-release-family-1',
    semantic: 'period-sale',
    value: input.value,
    unit: 'physical-units',
    territory: 'Korea',
    format: 'physical',
    providerPeriod: 'day:20261001',
    providerPublishedAt: null,
    observedAt: '2026-10-01T13:00:00+09:00',
    collectedAt: '2026-10-01T13:01:00+09:00',
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'as-known-at-collection',
    scopeRole: input.scopeRole ?? 'child-sku',
    parentObservationId: input.parentObservationId ?? null,
    syntheticFixture: false,
  });
}

function twoSkuInput() {
  return buildAlbumNormalizationInput({
    observations: [
      circleObservation({
        sku: '8800000000001',
        value: 100,
      }),
      circleObservation({
        sku: '8800000000002',
        value: 50,
      }),
    ],
    providers: [
      CIRCLE_EVIDENCE_DESCRIPTOR,
      HANTEO_EVIDENCE_DESCRIPTOR,
    ],
  });
}

test('reviewable packet assembles release and SKU facts without determining completeness', () => {
  const normalizationInput = twoSkuInput();
  const packet = buildAlbumReleaseScopeReviewPacket({
    normalizationInput,
    providers: [
      CIRCLE_EVIDENCE_DESCRIPTOR,
      HANTEO_EVIDENCE_DESCRIPTOR,
    ],
  });

  assert.equal(packet.state, 'reviewable');
  assert.equal(packet.releaseGroups.length, 1);
  assert.equal(packet.releaseGroups[0].releaseKey, 'release:iu-release-1');
  assert.deepEqual(
    packet.releaseGroups[0].skuIds,
    ['8800000000001', '8800000000002'],
  );
  assert.deepEqual(
    packet.releaseGroups[0].scopeKinds,
    ['sku'],
  );
  assert.equal(packet.reviewerConclusionRequired, true);
  assert.equal(packet.autoVerified, false);
  assert.equal(packet.completenessDetermined, false);
  assert.equal(packet.numericNormalizationDefined, false);

  const circleFact = packet.providerFacts.find(
    fact => fact.providerId === 'circle-chart',
  );
  assert.equal(circleFact?.role, 'primary');
  assert.equal(circleFact?.skuIdentityQualified, true);
  assert.equal(circleFact?.historicalQueriesQualified, true);

  const hanteoFact = packet.providerFacts.find(
    fact => fact.providerId === 'hanteo-chart',
  );
  assert.equal(hanteoFact?.role, 'secondary');
});

test('packet is deterministic for the same normalization input and provider qualifications', () => {
  const normalizationInput = twoSkuInput();

  const first = buildAlbumReleaseScopeReviewPacket({
    normalizationInput,
    providers: [
      CIRCLE_EVIDENCE_DESCRIPTOR,
      HANTEO_EVIDENCE_DESCRIPTOR,
    ],
  });
  const second = buildAlbumReleaseScopeReviewPacket({
    normalizationInput,
    providers: [
      HANTEO_EVIDENCE_DESCRIPTOR,
      CIRCLE_EVIDENCE_DESCRIPTOR,
    ],
  });

  assert.equal(first.packetId, second.packetId);
  assert.equal(first.targetFingerprint, second.targetFingerprint);
});

test('no primary normalization candidate produces insufficient evidence instead of a completeness conclusion', () => {
  const normalizationInput = buildAlbumNormalizationInput({
    observations: [],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  const packet = buildAlbumReleaseScopeReviewPacket({
    normalizationInput,
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  assert.equal(packet.state, 'insufficient-evidence');
  assert.equal(packet.primaryObservationIds.length, 0);
  assert.ok(
    packet.reasonCodes.includes(
      'no-primary-normalization-candidate',
    ),
  );
  assert.equal(packet.autoVerified, false);
});

test('blocked normalization conflicts produce a conflicting review packet', () => {
  const first = circleObservation({
    sku: '8800000000001',
    value: 100,
  });
  const second = buildDirectAlbumObservation({
    ...first,
    observationId: undefined,
    evidenceDigest: undefined,
    providerObservationId: 'parallel-conflict',
    value: 101,
  });

  const normalizationInput = buildAlbumNormalizationInput({
    observations: [first, second],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });
  assert.equal(normalizationInput.inputSetUsable, false);

  const packet = buildAlbumReleaseScopeReviewPacket({
    normalizationInput,
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  assert.equal(packet.state, 'conflicting-evidence');
  assert.equal(packet.blockedObservationIds.length, 2);
  assert.ok(
    packet.reasonCodes.includes(
      'normalization-input-has-blocked-observations',
    ),
  );
});

test('release-total overlap surfaces excluded child detail for reviewer inspection without adding it', () => {
  const total = circleObservation({
    sku: null,
    value: 150,
    scopeRole: 'release-total',
  });
  const child = circleObservation({
    sku: '8800000000001',
    value: 100,
    scopeRole: 'child-sku',
    parentObservationId: total.observationId,
  });

  const normalizationInput = buildAlbumNormalizationInput({
    observations: [total, child],
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });
  const packet = buildAlbumReleaseScopeReviewPacket({
    normalizationInput,
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  assert.equal(packet.state, 'reviewable');
  assert.deepEqual(
    packet.excludedDetailObservationIds,
    [child.observationId],
  );
  assert.deepEqual(
    packet.releaseGroups[0].excludedDetailObservationIds,
    [child.observationId],
  );
  assert.deepEqual(
    packet.releaseGroups[0].primaryObservationIds,
    [total.observationId],
  );
});

test('verified completeness decision requires external supporting evidence and a reviewable packet', () => {
  const normalizationInput = twoSkuInput();
  const packet = buildAlbumReleaseScopeReviewPacket({
    normalizationInput,
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  assert.throws(
    () => createReleaseScopeCompletenessEvidenceRecord({
      packet,
      decision: {
        packetId: packet.packetId,
        evidenceId: 'release-scope-review:missing-support',
        conclusion: 'verified',
        supportingEvidenceRefs: [],
        reviewerRef: 'review:release-scope',
        reviewedAt: '2026-10-01T20:00:00+09:00',
      },
    }),
    /verified_requires_supporting_evidence/,
  );

  const insufficientPacket = buildAlbumReleaseScopeReviewPacket({
    normalizationInput: buildAlbumNormalizationInput({
      observations: [],
      providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
    }),
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  assert.throws(
    () => createReleaseScopeCompletenessEvidenceRecord({
      packet: insufficientPacket,
      decision: {
        packetId: insufficientPacket.packetId,
        evidenceId: 'release-scope-review:invalid',
        conclusion: 'verified',
        supportingEvidenceRefs: ['provider-catalog:1'],
        reviewerRef: 'review:release-scope',
        reviewedAt: '2026-10-01T20:00:00+09:00',
      },
    }),
    /verified_requires_reviewable_packet/,
  );
});

test('reviewer-supported verified packet becomes only the release-scope evidence dimension', () => {
  const normalizationInput = twoSkuInput();
  const packet = buildAlbumReleaseScopeReviewPacket({
    normalizationInput,
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  const record = createReleaseScopeCompletenessEvidenceRecord({
    packet,
    decision: {
      packetId: packet.packetId,
      evidenceId: 'release-scope-review:1',
      conclusion: 'verified',
      supportingEvidenceRefs: [
        'provider-release-catalog:2026-10-01',
        'reviewed-sku-map:iu-release-1',
      ],
      reviewerRef: 'review-artifact:release-scope:1',
      reviewedAt: '2026-10-01T20:00:00+09:00',
    },
  });

  assert.equal(record.dimension, 'release-scope-completeness');
  assert.equal(record.conclusion, 'verified');
  assert.deepEqual(
    record.coveredObservationIds,
    packet.primaryObservationIds,
  );

  const review = reviewAlbumNormalizationCalibrationEvidence({
    normalizationInput,
    records: [record],
  });

  assert.equal(
    review.dimensions.releaseScopeCompleteness.state,
    'verified',
  );
  assert.equal(review.dimensions.periodCoverage.state, 'unknown');
  assert.equal(review.dimensions.revisionStability.state, 'unknown');
  assert.equal(review.readyForCalibrationGate, false);
});

test('packet mismatch is rejected before a decision can become calibration evidence', () => {
  const normalizationInput = twoSkuInput();
  const packet = buildAlbumReleaseScopeReviewPacket({
    normalizationInput,
    providers: [CIRCLE_EVIDENCE_DESCRIPTOR],
  });

  assert.throws(
    () => createReleaseScopeCompletenessEvidenceRecord({
      packet,
      decision: {
        packetId: 'stale-packet-id',
        evidenceId: 'release-scope-review:stale',
        conclusion: 'partial',
        supportingEvidenceRefs: [],
        reviewerRef: 'review-artifact:stale',
        reviewedAt: '2026-10-01T20:00:00+09:00',
      },
    }),
    /packet_mismatch/,
  );
});
