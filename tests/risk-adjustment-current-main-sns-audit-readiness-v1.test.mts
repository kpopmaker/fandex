import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY,
} from '../lib/intelligence/riskAdjustmentCurrentUpstreamEligibility';

type SnsFandomAuditEvidence = Readonly<{
  version: string;
  unresolvedEvidence: Readonly<Record<string, unknown>>;
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
) as SnsFandomAuditEvidence;

test('current-main snsFandom audit evidence remains fail-closed on provider gates', () => {
  assert.equal(
    evidence.version,
    'sns_fandom_youtube_audit_evidence_refs_v1',
  );
  assert.equal(evidence.fixtureValuesAreProductionEvidence, false);
  assert.equal(evidence.providerApprovalGranted, false);
  assert.equal(evidence.providerSubmissionAuthorized, false);
  assert.equal(evidence.productionCollectionAuthorized, false);
});

test('current-main snsFandom unresolved provider identity and measured quota evidence remain explicit', () => {
  for (const key of [
    'providerClientIdentityRef',
    'googleCloudProjectNumber',
    'cloudProjectRef',
    'realMeasurementWindowRef',
    'cadenceEvidenceRef',
    'uploadManifestPageCountPerReactionRun',
    'videoCountPerReactionRun',
    'quotaEstimateRef',
    'maxVideoIdsPerCall',
    'providerBatchLimitEvidenceRef',
    'maxChannelIdsPerCall',
  ]) {
    assert.equal(
      evidence.unresolvedEvidence[key],
      null,
      key + ' unexpectedly resolved; Risk eligibility must be reviewed',
    );
  }
});

test('snsFandom stays excluded while provider approval or Production collection is false', () => {
  const eligibility =
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.find(
      (entry) => entry.variableId === 'snsFandomPoint',
    );

  assert.ok(eligibility);
  assert.equal(
    evidence.providerApprovalGranted
      && evidence.productionCollectionAuthorized,
    false,
  );
  assert.equal(eligibility.acceptedForRiskConsumption, false);
  assert.equal(
    eligibility.exclusionReason,
    'sns-fandom-provider-and-product-gates-open',
  );
});

test('audit evidence readiness cannot be inferred from resolved legal URLs alone', () => {
  assert.equal(
    Boolean(
      evidence.providerApprovalGranted
      || evidence.productionCollectionAuthorized
      || evidence.providerSubmissionAuthorized
    ),
    false,
  );
});
