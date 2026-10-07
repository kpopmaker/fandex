import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RISK_ADJUSTMENT_UPSTREAM_CANDIDATES,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  assertRiskAdjustmentCurrentEligibilityConsistency,
  RISK_ADJUSTMENT_CURRENT_ELIGIBLE_UPSTREAM_VARIABLE_IDS,
  RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY,
} from '../lib/intelligence/riskAdjustmentCurrentUpstreamEligibility';

test('current upstream eligibility snapshot covers every Risk candidate exactly once', () => {
  assert.deepEqual(
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.map(
      (entry) => entry.variableId,
    ),
    RISK_ADJUSTMENT_UPSTREAM_CANDIDATES,
  );

  assert.equal(
    new Set(
      RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.map(
        (entry) => entry.variableId,
      ),
    ).size,
    RISK_ADJUSTMENT_UPSTREAM_CANDIDATES.length,
  );
});

test('only current Real Production Product truth is accepted for Risk consumption', () => {
  assert.deepEqual(
    RISK_ADJUSTMENT_CURRENT_ELIGIBLE_UPSTREAM_VARIABLE_IDS,
    ['newsIssuePoint', 'comebackActivityPoint'],
  );

  assert.deepEqual(
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.map((entry) => ({
      variableId: entry.variableId,
      eligibilityState: entry.eligibilityState,
      acceptedForRiskConsumption: entry.acceptedForRiskConsumption,
      exclusionReason: entry.exclusionReason,
    })),
    [
      {
        variableId: 'newsIssuePoint',
        eligibilityState: 'current-real-production',
        acceptedForRiskConsumption: true,
        exclusionReason: null,
      },
      {
        variableId: 'comebackActivityPoint',
        eligibilityState: 'current-real-production',
        acceptedForRiskConsumption: true,
        exclusionReason: null,
      },
      {
        variableId: 'growthMomentumPoint',
        eligibilityState: 'not-current-real-production',
        acceptedForRiskConsumption: false,
        exclusionReason: 'momentum-publication-not-production',
      },
      {
        variableId: 'musicAlbumPoint',
        eligibilityState: 'not-current-real-production',
        acceptedForRiskConsumption: false,
        exclusionReason:
          'music-album-reported-web-current-production-not-ready',
      },
      {
        variableId: 'snsFandomPoint',
        eligibilityState: 'not-current-real-production',
        acceptedForRiskConsumption: false,
        exclusionReason: 'sns-fandom-provider-and-product-gates-open',
      },
      {
        variableId: 'brandFitPoint',
        eligibilityState: 'not-current-real-production',
        acceptedForRiskConsumption: false,
        exclusionReason: 'brand-fit-product-activation-not-authorized',
      },
    ],
  );
});

test('eligibility inventory is consistent with current accepted handoff inventory', () => {
  assert.equal(
    assertRiskAdjustmentCurrentEligibilityConsistency(),
    true,
  );
});

test('excluded candidates carry owner scope and non-empty upstream evidence refs', () => {
  const excluded =
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.filter(
      (entry) => !entry.acceptedForRiskConsumption,
    );

  assert.equal(excluded.length, 4);
  for (const entry of excluded) {
    assert.notEqual(entry.exclusionReason, null);
    assert.ok(entry.ownerScope.length > 0);
    assert.ok(entry.evidenceRefs.length > 0);
    assert.equal(
      entry.evidenceRefs.every((ref) => ref.trim().length > 0),
      true,
    );
  }
});


test('musicAlbumPoint Risk exclusion no longer treats licensed provider issue 174 as the mandatory Production path', () => {
  const album =
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.find(
      entry => entry.variableId === 'musicAlbumPoint',
    );
  assert.ok(album);
  if (!album) return;

  assert.equal(album.acceptedForRiskConsumption, false);
  assert.equal(
    album.exclusionReason,
    'music-album-reported-web-current-production-not-ready',
  );
  assert.equal(
    album.evidenceRefs.includes(
      'upstream-external-dependency:issue-174',
    ),
    false,
  );
  assert.ok(
    album.evidenceRefs.includes(
      'producer-contract:music-album-point-risk-quality-metadata-v1',
    ),
  );
  assert.ok(
    album.evidenceRefs.includes(
      'source-contract:reported-album-sales-production-source-v1',
    ),
  );
});
