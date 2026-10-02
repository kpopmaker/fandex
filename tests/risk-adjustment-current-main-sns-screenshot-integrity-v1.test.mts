import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY,
} from '../lib/intelligence/riskAdjustmentCurrentUpstreamEligibility';

type AuditEvidence = Readonly<{
  resolvedEvidence: Readonly<{
    privacyPolicyScreenshotRef: string | null;
    homepageScreenshotRef: string | null;
    dashboardFeatureScreenshotRef: string | null;
  }>;
  fixtureValuesAreProductionEvidence: boolean;
  providerApprovalGranted: boolean;
  productionCollectionAuthorized: boolean;
  providerSubmissionAuthorized: boolean;
}>;

const evidence = JSON.parse(
  readFileSync(
    'docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
    'utf8',
  ),
) as AuditEvidence;

test('screenshot evidence never promotes snsFandom into current Real Risk inputs by itself', () => {
  const eligibility =
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.find(
      (entry) => entry.variableId === 'snsFandomPoint',
    );

  assert.ok(eligibility);
  assert.equal(evidence.fixtureValuesAreProductionEvidence, false);
  assert.equal(evidence.providerApprovalGranted, false);
  assert.equal(evidence.productionCollectionAuthorized, false);
  assert.equal(evidence.providerSubmissionAuthorized, false);
  assert.equal(eligibility.acceptedForRiskConsumption, false);
  assert.equal(
    eligibility.exclusionReason,
    'sns-fandom-provider-and-product-gates-open',
  );
});

test('a present dashboard screenshot ref is treated as non-authoritative until upstream validates it', () => {
  if (evidence.resolvedEvidence.dashboardFeatureScreenshotRef !== null) {
    assert.ok(
      evidence.resolvedEvidence.dashboardFeatureScreenshotRef.length > 0,
    );
    assert.equal(evidence.providerApprovalGranted, false);
    assert.equal(evidence.productionCollectionAuthorized, false);
    assert.equal(evidence.providerSubmissionAuthorized, false);
  }
});

test('valid legal screenshots still do not satisfy provider and Product readiness gates', () => {
  assert.ok(
    evidence.resolvedEvidence.privacyPolicyScreenshotRef === null
      || evidence.resolvedEvidence.privacyPolicyScreenshotRef.length > 0,
  );
  assert.ok(
    evidence.resolvedEvidence.homepageScreenshotRef === null
      || evidence.resolvedEvidence.homepageScreenshotRef.length > 0,
  );

  const eligibility =
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.find(
      (entry) => entry.variableId === 'snsFandomPoint',
    );
  assert.equal(eligibility?.acceptedForRiskConsumption, false);
});
