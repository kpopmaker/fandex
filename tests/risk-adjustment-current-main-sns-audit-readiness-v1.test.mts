import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY,
} from '../lib/intelligence/riskAdjustmentCurrentUpstreamEligibility';

type SnsFandomAuditEvidence = Readonly<{
  version: string;
  resolvedEvidence: Readonly<Record<string, unknown>>;
  unresolvedEvidence: Readonly<Record<string, unknown>>;
  optionalOptimizationEvidence: Readonly<Record<string, unknown>>;
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

test('current-main snsFandom identity, superseding Phase B plan, and singleton batching are resolved while measured Phase C usage remains unresolved', () => {
  assert.equal(
    evidence.resolvedEvidence.providerClientIdentityRef,
    'gcp-project-fandex-509708',
  );
  assert.equal(
    evidence.resolvedEvidence.googleCloudProjectNumber,
    '385464276768',
  );
  assert.equal(
    evidence.resolvedEvidence.googleCloudProjectId,
    'fandex-509708',
  );
  assert.equal(
    evidence.resolvedEvidence.cloudProjectRef,
    'github-issue://kpopmaker/fandex/issues/424#provider-client-owner-evidence-2026-10-03',
  );
  assert.equal(
    evidence.resolvedEvidence.realMeasurementWindowRef,
    'github-issue://kpopmaker/fandex/issues/424#issuecomment-5967962631',
  );
  assert.equal(
    evidence.resolvedEvidence.measurementWindowStart,
    '2026-10-03T15:00:00.000Z',
  );
  assert.equal(
    evidence.resolvedEvidence.measurementWindowEnd,
    '2027-10-04T15:00:00.000Z',
  );
  assert.equal(evidence.resolvedEvidence.reactionSnapshotRunsPerDay, 24);
  assert.equal(
    evidence.resolvedEvidence.cadenceEvidenceRef,
    'github-issue://kpopmaker/fandex/issues/424#issuecomment-5967962631',
  );
  assert.equal(
    evidence.resolvedEvidence.requestBatchingStrategy,
    'singleton-only-until-provider-batch-limit-evidence',
  );
  assert.equal(evidence.resolvedEvidence.channelIdsPerCall, 1);
  assert.equal(evidence.resolvedEvidence.videoIdsPerCall, 1);
  assert.equal(evidence.resolvedEvidence.providerBatchLimitClaimed, false);

  for (const key of [
    'uploadManifestPageCountPerReactionRun',
    'videoCountPerReactionRun',
    'quotaEstimateRef',
  ]) {
    assert.equal(
      evidence.unresolvedEvidence[key],
      null,
      key + ' unexpectedly resolved; Risk eligibility must be reviewed',
    );
  }

  for (const key of [
    'maxChannelIdsPerCall',
    'maxVideoIdsPerCall',
    'providerBatchLimitEvidenceRef',
  ]) {
    assert.equal(
      evidence.optionalOptimizationEvidence[key],
      null,
      key + ' unexpectedly resolved; provider optimization evidence must remain explicit',
    );
  }
  assert.equal(
    evidence.optionalOptimizationEvidence.requiredForCurrentSingletonQuotaWorksheet,
    false,
  );
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
