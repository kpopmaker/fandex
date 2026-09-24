import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildActivityExposureLiveCoverageManifest,
  type ActivityExposureProviderCoverageResult,
} from '../lib/research/activityExposureCoverageManifest';

const baseCoverage = {
  coverageObservedAt: '2026-09-25T00:00:00Z',
  coverageScope: 'current_visible_inventory' as const,
  eventTimeStart: null,
  eventTimeEnd: null,
  observationBasis: 'provider_inventory' as const,
};

const completeMusicBrainz: ActivityExposureProviderCoverageResult = {
  provider: 'musicbrainz',
  providerArtistId: 'b9545342-1e6d-4dae-84ac-013374ad8d7c',
  coverage: {
    provider: 'musicbrainz',
    state: 'complete',
    reason: 'current provider inventory exhausted',
    ...baseCoverage,
  },
  inventoryExhausted: true,
  discoveredEntityCount: 58,
  normalizedEventCount: 58,
  excludedEntityCount: 0,
  missingEntityCount: 0,
  invalidEntityCount: 0,
  retainedObservationCount: 116,
  digestOnlyObservationCount: 0,
  unavailableObservationCount: 0,
  authorizationState: 'resolved_for_research',
  unresolvedIdentityCount: 0,
  notes: [],
};

const completeYouTube: ActivityExposureProviderCoverageResult = {
  provider: 'youtube',
  providerArtistId: 'UC3SyT4_WLHzN7JmHQwKQZww',
  coverage: {
    provider: 'youtube',
    state: 'complete',
    reason: 'current visible uploads inventory exhausted',
    ...baseCoverage,
  },
  inventoryExhausted: true,
  discoveredEntityCount: 120,
  normalizedEventCount: 120,
  excludedEntityCount: 0,
  missingEntityCount: 0,
  invalidEntityCount: 0,
  retainedObservationCount: 121,
  digestOnlyObservationCount: 0,
  unavailableObservationCount: 0,
  authorizationState: 'resolved_for_research',
  unresolvedIdentityCount: 0,
  notes: ['synthetic acceptance-contract fixture only'],
};

function build(providers: readonly ActivityExposureProviderCoverageResult[]) {
  return buildActivityExposureLiveCoverageManifest({
    artistId: 'iu',
    generatedAt: '2026-09-25T00:00:00Z',
    sourceBranch: 'research/comeback-activity-point-source-contract-v1',
    sourceHeadSha: '1111111111111111111111111111111111111111',
    currentMainSha: '2222222222222222222222222222222222222222',
    providers,
  });
}

test('complete declared scopes with retained evidence pass only to integration review', () => {
  const manifest = build([completeMusicBrainz, completeYouTube]);

  assert.equal(manifest.gateDecision, 'pass_for_integration_review');
  assert.equal(manifest.numericScoreProduced, false);
});

test('unbounded partial coverage remains blocked instead of being treated as zero or success', () => {
  const manifest = build([
    completeMusicBrainz,
    {
      ...completeYouTube,
      coverage: {
        ...completeYouTube.coverage,
        state: 'partial',
        reason: 'some requested videos were unavailable',
      },
      inventoryExhausted: true,
      missingEntityCount: 2,
    },
  ]);

  assert.equal(manifest.gateDecision, 'blocked_live_coverage');
  assert.ok(manifest.gateReasons.includes('live-provider-coverage-incomplete'));
});

test('unresolved provider identity blocks the integration gate', () => {
  const manifest = build([
    {
      ...completeMusicBrainz,
      coverage: {
        ...completeMusicBrainz.coverage,
        state: 'identity_unresolved',
        reason: 'artist mapping requires review',
      },
      unresolvedIdentityCount: 1,
    },
    completeYouTube,
  ]);

  assert.equal(manifest.gateDecision, 'blocked_identity');
});

test('authorization review or missing retained evidence blocks integration review', () => {
  const manifest = build([
    completeMusicBrainz,
    {
      ...completeYouTube,
      authorizationState: 'review_required',
      retainedObservationCount: 0,
      digestOnlyObservationCount: 121,
    },
  ]);

  assert.equal(manifest.gateDecision, 'blocked_authorization');
});

test('invalid evidence blocks even if coverage claims complete', () => {
  const manifest = build([
    {
      ...completeMusicBrainz,
      invalidEntityCount: 1,
    },
    completeYouTube,
  ]);

  assert.equal(manifest.gateDecision, 'blocked_invalid_evidence');
  assert.ok(
    manifest.gateReasons.some((reason) =>
      reason.includes('complete-coverage-with-invalid-entities'),
    ),
  );
});

test('complete coverage cannot be claimed without inventory exhaustion', () => {
  const manifest = build([
    completeMusicBrainz,
    {
      ...completeYouTube,
      inventoryExhausted: false,
    },
  ]);

  assert.equal(manifest.gateDecision, 'blocked_invalid_evidence');
  assert.ok(
    manifest.gateReasons.some((reason) =>
      reason.includes('complete-coverage-without-inventory-exhaustion'),
    ),
  );
});


test('explicit bounded partial scope may advance only to bounded integration review', () => {
  const manifest = build([
    completeMusicBrainz,
    {
      ...completeYouTube,
      coverage: {
        ...completeYouTube.coverage,
        state: 'partial',
        reason: 'bounded historical evidence set does not claim all-history completeness',
        coverageScope: 'stored_evidence_set',
        observationBasis: 'stored_evidence',
      },
      inventoryExhausted: true,
      missingEntityCount: 0,
    },
  ]);

  assert.equal(
    manifest.gateDecision,
    'pass_bounded_partial_for_integration_review',
  );
  assert.ok(
    manifest.gateReasons.includes(
      'bounded-partial-provider-scopes-explicitly-preserved',
    ),
  );
});
