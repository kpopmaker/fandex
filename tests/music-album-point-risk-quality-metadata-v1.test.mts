import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMusicAlbumPointRiskQualityMetadata,
  MUSIC_ALBUM_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
} from '../lib/product/adapters/musicAlbumPointRiskQualityMetadata';
import {
  adaptRiskAdjustmentProducerQualityMetadata,
} from '../lib/intelligence/riskAdjustmentProducerMetadataAdapter';
import type {
  ReportedAlbumSalesCurrentReleaseRead,
} from '../lib/alternative-evidence/reportedAlbumSalesCurrentRelease';

function unavailable(): ReportedAlbumSalesCurrentReleaseRead {
  return {
    status: 'unavailable',
    contractVersion: 'reported-album-sales-current-release-v1',
    canonicalArtistId: 'iu',
    reason: 'latest-release-not-verified',
    freshnessState: 'unknown',
    value: null,
    unit: null,
    missingIsZero: false,
    missingIsStable: false,
  };
}

function available(): ReportedAlbumSalesCurrentReleaseRead {
  return {
    status: 'available',
    contractVersion: 'reported-album-sales-current-release-v1',
    canonicalArtistId: 'iu',
    canonicalReleaseId: 'release:iu:test',
    releaseTitle: 'Test Album',
    releaseDate: '2026-10-01',
    edition: null,
    editionResolutionState: 'release-level',
    canonicalEditionId: null,
    metricSemantic: 'reported-hanteo-first-week-sales',
    value: 123_456,
    unit: 'physical-copies',
    providerPeriodStart: '2026-10-01',
    providerPeriodEnd: '2026-10-07',
    observationId: 'obs-test',
    observationScopeId: 'scope-test',
    evidenceDigest: 'a'.repeat(64),
    sourceCandidateDigest: 'b'.repeat(64),
    evidenceRefs: ['source:test'],
    freshnessState: 'verified-current-release',
    conflictState: 'clear',
    revisionState: 'original',
    lifecycle: 'production-candidate',
    numericScoreDefined: false,
  };
}

test('producer exposes all Risk quality dimensions while current web evidence is still blocked', () => {
  const metadata =
    buildMusicAlbumPointRiskQualityMetadata(unavailable());

  assert.equal(
    metadata.contractVersion,
    MUSIC_ALBUM_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
  );
  assert.equal(metadata.variableId, 'musicAlbumPoint');
  assert.equal(metadata.lifecycleState, 'production-candidate');
  assert.equal(metadata.materialClass, 'real');
  assert.equal(
    metadata.availabilityState,
    'upstream-unavailable-ambiguous',
  );
  assert.equal(metadata.identityState, 'unresolved');
  assert.equal(metadata.confidenceState, 'insufficient');
  assert.equal(metadata.coverageState, 'unknown');
  assert.equal(metadata.freshnessState, 'unknown');
  assert.equal(metadata.conflictState, 'unknown');
  assert.equal(metadata.revisionState, 'unknown');
  assert.equal(metadata.historyState, 'unknown');
  assert.equal(metadata.riskConsumptionAuthorized, false);
  assert.equal(metadata.numericScoreDefined, false);

  for (const semantic of Object.values(
    metadata.requiredDimensionSemantics,
  )) {
    assert.ok(semantic.evidenceRefs.length > 0);
    assert.notEqual(semantic.stateValue, '');
  }
});

test('available current source has explicit current/conflict/revision metadata but remains non-Production and Risk-ineligible', () => {
  const metadata =
    buildMusicAlbumPointRiskQualityMetadata(available());

  assert.equal(metadata.availabilityState, 'available');
  assert.equal(metadata.identityState, 'resolved');
  assert.equal(metadata.freshnessState, 'current');
  assert.equal(metadata.conflictState, 'none');
  assert.equal(metadata.revisionState, 'stable');
  assert.equal(metadata.lifecycleState, 'production-candidate');

  const adapted =
    adaptRiskAdjustmentProducerQualityMetadata(metadata);
  assert.equal(adapted.status, 'ok');
  if (adapted.status !== 'ok') return;
  assert.equal(adapted.envelope.variableId, 'musicAlbumPoint');
  assert.equal(
    adapted.assessment.status,
    'not-production-eligible',
  );
  assert.equal(
    adapted.assessment.handoff.acceptedForRiskConsumption,
    false,
  );
});

test('producer metadata is categorical quality only and never defines a score, weight, or penalty', () => {
  const metadata =
    buildMusicAlbumPointRiskQualityMetadata(available());
  const serialized = JSON.stringify(metadata);

  assert.equal(serialized.includes('"score"'), false);
  assert.equal(serialized.includes('"weight"'), false);
  assert.equal(serialized.includes('"penalty"'), false);
});
