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
    dashboardFeatureScreenshotRef?: string | null;
  }>;
  unresolvedEvidence: Readonly<{
    dashboardFeatureScreenshotRef: string | null;
  }>;
  rejectedEvidence: Readonly<{
    dashboardFeatureScreenshotCandidate: Readonly<{
      ref: string;
      sha256: string;
      sourceUrl: string;
      rejectionReason: string;
    }>;
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

test('synthetic dashboard screenshot is rejected and remains unresolved', () => {
  assert.equal(
    evidence.resolvedEvidence.dashboardFeatureScreenshotRef,
    undefined,
  );
  assert.equal(
    evidence.unresolvedEvidence.dashboardFeatureScreenshotRef,
    null,
  );

  const rejected =
    evidence.rejectedEvidence.dashboardFeatureScreenshotCandidate;

  assert.ok(rejected.ref.length > 0);
  assert.ok(rejected.sha256.length > 0);
  assert.equal(rejected.sourceUrl, 'https://fandex-eta.vercel.app/');
  assert.equal(
    rejected.rejectionReason,
    'source-is-explicitly-synthetic-preview-homepage-not-production-analytics-reporting-feature',
  );
});

test('valid legal screenshots remain separate from provider and Product readiness gates', () => {
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

  assert.ok(eligibility);
  assert.equal(eligibility.acceptedForRiskConsumption, false);
});
