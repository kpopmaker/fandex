import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CIRCLE_EVIDENCE_DESCRIPTOR,
} from '../lib/alternative-evidence/directProviderEvidence';
import {
  ALBUM_PROVIDER_AUTHORIZATION_EVIDENCE_RECORD_VERSION,
  REQUIRED_ALBUM_PRODUCTION_AUTHORIZATION_DIMENSIONS,
  buildAlbumProviderAuthorizationReviewPacket,
  reviewAlbumProviderAuthorizationEvidence,
  type AlbumProviderAuthorizationEvidenceRecord,
} from '../lib/product/readiness/albumProviderAuthorizationReview';

function record(
  packet: ReturnType<typeof buildAlbumProviderAuthorizationReviewPacket>,
  dimension: AlbumProviderAuthorizationEvidenceRecord['dimension'],
  state: AlbumProviderAuthorizationEvidenceRecord['state'] = 'allowed',
  overrides: Partial<AlbumProviderAuthorizationEvidenceRecord> = {},
): AlbumProviderAuthorizationEvidenceRecord {
  return Object.freeze({
    recordVersion:
      ALBUM_PROVIDER_AUTHORIZATION_EVIDENCE_RECORD_VERSION,
    evidenceId: `rights:${dimension}`,
    providerId: packet.providerId,
    targetFingerprint: packet.targetFingerprint,
    dimension,
    state,
    evidenceRefs: Object.freeze([
      `contract-or-policy:${dimension}`,
    ]),
    conditionRefs: Object.freeze(
      state === 'allowed-with-conditions'
        ? [`conditions:${dimension}`]
        : [],
    ),
    reviewerRef: 'rights-review:fixture',
    reviewedAt: '2026-10-02T00:20:00+09:00',
    ...overrides,
  });
}

function fullProductionRecords(
  packet: ReturnType<typeof buildAlbumProviderAuthorizationReviewPacket>,
): readonly AlbumProviderAuthorizationEvidenceRecord[] {
  return Object.freeze([
    ...REQUIRED_ALBUM_PRODUCTION_AUTHORIZATION_DIMENSIONS.map(
      dimension => record(packet, dimension),
    ),
    record(packet, 'rawStorageState', 'allowed-with-conditions'),
    record(packet, 'rawRedistributionState', 'blocked', {
      evidenceRefs: Object.freeze(['policy:raw-redistribution-blocked']),
    }),
  ]);
}

test('technical capability packet never auto-authorizes Production rights', () => {
  const packet =
    buildAlbumProviderAuthorizationReviewPacket(
      CIRCLE_EVIDENCE_DESCRIPTOR,
    );

  assert.equal(
    packet.technicalFacts.nativePeriodSalesQualified,
    true,
  );
  assert.equal(
    packet.technicalFacts.historicalQueriesQualified,
    true,
  );
  assert.equal(packet.technicalFacts.revisionsQualified, true);
  assert.equal(packet.technicalCapabilityImpliesAuthorization, false);
  assert.equal(packet.reviewerConclusionRequired, true);
  assert.equal(packet.autoAuthorized, false);

  const review = reviewAlbumProviderAuthorizationEvidence({
    packet,
    records: [],
  });

  assert.equal(review.productionAuthorizationSatisfied, false);
  assert.equal(review.autoAuthorized, false);
  assert.equal(
    review.dimensions.acquisitionState.state,
    'unknown',
  );
});

test('all six required evidence-backed dimensions authorize Production while raw redistribution may remain blocked', () => {
  const packet =
    buildAlbumProviderAuthorizationReviewPacket(
      CIRCLE_EVIDENCE_DESCRIPTOR,
    );
  const review = reviewAlbumProviderAuthorizationEvidence({
    packet,
    records: fullProductionRecords(packet),
  });

  assert.equal(review.dataIssues.length, 0);
  assert.equal(review.productionAuthorizationSatisfied, true);

  for (
    const dimension
    of REQUIRED_ALBUM_PRODUCTION_AUTHORIZATION_DIMENSIONS
  ) {
    assert.equal(review.dimensions[dimension].authorized, true);
  }

  assert.equal(
    review.dimensions.rawRedistributionState.state,
    'blocked',
  );
  assert.equal(
    review.dimensions.rawRedistributionState.authorized,
    false,
  );
});

test('allowed-with-conditions requires explicit condition evidence', () => {
  const packet =
    buildAlbumProviderAuthorizationReviewPacket(
      CIRCLE_EVIDENCE_DESCRIPTOR,
    );
  const records = fullProductionRecords(packet).map(recordValue =>
    recordValue.dimension === 'commercialUseState'
      ? record(packet, 'commercialUseState', 'allowed-with-conditions', {
          conditionRefs: Object.freeze([]),
        })
      : recordValue,
  );

  const review = reviewAlbumProviderAuthorizationEvidence({
    packet,
    records,
  });

  assert.equal(review.productionAuthorizationSatisfied, false);
  assert.ok(
    review.dataIssues.some(issue =>
      issue.startsWith(
        'conditional-authorization-condition-missing:',
      )),
  );
});

test('an allowed state without source evidence is invalid', () => {
  const packet =
    buildAlbumProviderAuthorizationReviewPacket(
      CIRCLE_EVIDENCE_DESCRIPTOR,
    );
  const records = fullProductionRecords(packet).map(recordValue =>
    recordValue.dimension === 'automationState'
      ? record(packet, 'automationState', 'allowed', {
          evidenceRefs: Object.freeze([]),
        })
      : recordValue,
  );

  const review = reviewAlbumProviderAuthorizationEvidence({
    packet,
    records,
  });

  assert.equal(review.productionAuthorizationSatisfied, false);
  assert.ok(
    review.dataIssues.some(issue =>
      issue.startsWith('authorized-state-evidence-missing:')),
  );
});

test('stale provider target fingerprint cannot authorize current provider rights', () => {
  const packet =
    buildAlbumProviderAuthorizationReviewPacket(
      CIRCLE_EVIDENCE_DESCRIPTOR,
    );
  const records = fullProductionRecords(packet).map(recordValue =>
    recordValue.dimension === 'acquisitionState'
      ? Object.freeze({
          ...recordValue,
          targetFingerprint: `${packet.targetFingerprint}-stale`,
        })
      : recordValue,
  );

  const review = reviewAlbumProviderAuthorizationEvidence({
    packet,
    records,
  });

  assert.equal(review.productionAuthorizationSatisfied, false);
  assert.ok(
    review.dataIssues.some(issue =>
      issue.startsWith('target-fingerprint-mismatch:')),
  );
});

test('duplicate or conflicting dimension records fail closed', () => {
  const packet =
    buildAlbumProviderAuthorizationReviewPacket(
      CIRCLE_EVIDENCE_DESCRIPTOR,
    );
  const records = [
    ...fullProductionRecords(packet),
    record(packet, 'acquisitionState', 'blocked', {
      evidenceId: 'rights:acquisitionState:block',
      evidenceRefs: Object.freeze(['legal-review:block']),
    }),
  ];

  const review = reviewAlbumProviderAuthorizationEvidence({
    packet,
    records,
  });

  assert.equal(review.productionAuthorizationSatisfied, false);
  assert.ok(
    review.dataIssues.some(issue =>
      issue.includes(
        'acquisitionState:multiple-authorization-records-for-dimension',
      )),
  );
  assert.ok(
    review.dataIssues.some(issue =>
      issue.includes(
        'acquisitionState:conflicting-authorization-states',
      )),
  );
});

test('packet fingerprint changes when provider technical/onboarding evidence target changes', () => {
  const original =
    buildAlbumProviderAuthorizationReviewPacket(
      CIRCLE_EVIDENCE_DESCRIPTOR,
    );
  const changed =
    buildAlbumProviderAuthorizationReviewPacket({
      ...CIRCLE_EVIDENCE_DESCRIPTOR,
      onboarding: Object.freeze({
        ...CIRCLE_EVIDENCE_DESCRIPTOR.onboarding,
        blockers: Object.freeze([
          ...CIRCLE_EVIDENCE_DESCRIPTOR.onboarding.blockers,
          'new-rights-review-blocker',
        ]),
      }),
    });

  assert.notEqual(
    original.targetFingerprint,
    changed.targetFingerprint,
  );
});
