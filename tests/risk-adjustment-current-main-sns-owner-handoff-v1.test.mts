import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeProviderClientOwnerHandoff,
} from '../lib/intelligence/snsFandomPointYoutubeProviderClientOwnerHandoff';
import {
  evaluateSnsFandomYoutubeQuotaOwnerHandoff,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaOwnerHandoff';
import {
  RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY,
} from '../lib/intelligence/riskAdjustmentCurrentUpstreamEligibility';

type OwnerInput = Readonly<{
  providerClientRef: string | null;
  googleCloudProjectNumber: string | null;
  googleCloudProjectId: string | null;
  credentialLocatorRef: string | null;
  cloudProjectEvidenceRef: string | null;
  verifiedAt: string | null;
  providerApprovalGranted: boolean;
  productionCollectionAuthorized: boolean;
  providerSubmissionAuthorized: boolean;
}>;

const ownerInput = JSON.parse(
  readFileSync(
    'docs/research/sns-fandom-youtube-provider-client-owner-input-v1.json',
    'utf8',
  ),
) as OwnerInput;

type QuotaOwnerInput = Readonly<{
  measurementWindowStart: string | null;
  measurementWindowEnd: string | null;
  reactionSnapshotRunsPerDay: number | null;
  cadenceEvidenceRef: string | null;
  measuredAt: string | null;
  uploadManifestPageCountPerReactionRun: number | null;
  videoCountPerReactionRun: number | null;
  measuredUsageEvidenceRef: string | null;
  maxChannelIdsPerCall: number | null;
  maxVideoIdsPerCall: number | null;
  providerBatchLimitEvidenceRef: string | null;
  automaticProviderCallAllowed: boolean;
  collectionExecutionAuthorized: boolean;
  schedulerMutationAllowed: boolean;
  deploymentAuthorized: boolean;
  providerSubmissionAuthorized: boolean;
}>;

const quotaOwnerInput = JSON.parse(
  readFileSync(
    'docs/research/sns-fandom-youtube-quota-owner-input-v1.json',
    'utf8',
  ),
) as QuotaOwnerInput;

test('merged snsFandom owner handoff remains awaiting real owner evidence', () => {
  const result =
    evaluateSnsFandomYoutubeProviderClientOwnerHandoff({
      providerClientRef: ownerInput.providerClientRef,
      googleCloudProjectNumber: ownerInput.googleCloudProjectNumber,
      googleCloudProjectId: ownerInput.googleCloudProjectId,
      credentialLocatorRef: ownerInput.credentialLocatorRef,
      cloudProjectEvidenceRef: ownerInput.cloudProjectEvidenceRef,
      verifiedAt: ownerInput.verifiedAt,
    });

  assert.equal(result.state, 'awaiting-owner-evidence');
  assert.deepEqual(result.missingOwnerFields, [
    'cloudProjectEvidenceRef',
    'credentialLocatorRef',
    'googleCloudProjectNumber',
    'providerClientRef',
    'verifiedAt',
  ]);
  assert.equal(result.providerClientIdentity, null);
  assert.equal(result.secretMaterialStored, false);
  assert.equal(result.providerApprovalGranted, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.providerSubmissionAuthorized, false);
});

test('checked-in owner template does not claim provider authorization', () => {
  assert.equal(ownerInput.providerApprovalGranted, false);
  assert.equal(ownerInput.productionCollectionAuthorized, false);
  assert.equal(ownerInput.providerSubmissionAuthorized, false);
});

test('merged owner-handoff contract alone does not make snsFandom a current Real Risk input', () => {
  const eligibility =
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.find(
      (entry) => entry.variableId === 'snsFandomPoint',
    );

  assert.ok(eligibility);
  assert.equal(eligibility.acceptedForRiskConsumption, false);
  assert.equal(
    eligibility.exclusionReason,
    'sns-fandom-provider-and-product-gates-open',
  );
});


test('merged snsFandom quota owner handoff remains awaiting real plan evidence', () => {
  const result = evaluateSnsFandomYoutubeQuotaOwnerHandoff({
    measurementWindowStart: quotaOwnerInput.measurementWindowStart,
    measurementWindowEnd: quotaOwnerInput.measurementWindowEnd,
    reactionSnapshotRunsPerDay: quotaOwnerInput.reactionSnapshotRunsPerDay,
    cadenceEvidenceRef: quotaOwnerInput.cadenceEvidenceRef,
    measuredAt: quotaOwnerInput.measuredAt,
    uploadManifestPageCountPerReactionRun:
      quotaOwnerInput.uploadManifestPageCountPerReactionRun,
    videoCountPerReactionRun: quotaOwnerInput.videoCountPerReactionRun,
    measuredUsageEvidenceRef: quotaOwnerInput.measuredUsageEvidenceRef,
    maxChannelIdsPerCall: quotaOwnerInput.maxChannelIdsPerCall,
    maxVideoIdsPerCall: quotaOwnerInput.maxVideoIdsPerCall,
    providerBatchLimitEvidenceRef:
      quotaOwnerInput.providerBatchLimitEvidenceRef,
  });

  assert.equal(result.state, 'awaiting-owner-plan-evidence');
  assert.deepEqual(result.missingPlanFields, [
    'cadenceEvidenceRef',
    'measurementWindowEnd',
    'measurementWindowStart',
    'reactionSnapshotRunsPerDay',
  ]);
  assert.deepEqual(result.missingMeasurementFields, [
    'maxChannelIdsPerCall',
    'maxVideoIdsPerCall',
    'measuredAt',
    'measuredUsageEvidenceRef',
    'providerBatchLimitEvidenceRef',
    'uploadManifestPageCountPerReactionRun',
    'videoCountPerReactionRun',
  ]);
  assert.deepEqual(result.invalidFields, []);
  assert.equal(result.automaticProviderCallAllowed, false);
  assert.equal(result.collectionExecutionAuthorized, false);
  assert.equal(result.schedulerMutationAllowed, false);
  assert.equal(result.deploymentAuthorized, false);
  assert.equal(result.providerSubmissionAuthorized, false);
});

test('checked-in quota owner template does not authorize provider or collection actions', () => {
  assert.equal(quotaOwnerInput.automaticProviderCallAllowed, false);
  assert.equal(quotaOwnerInput.collectionExecutionAuthorized, false);
  assert.equal(quotaOwnerInput.schedulerMutationAllowed, false);
  assert.equal(quotaOwnerInput.deploymentAuthorized, false);
  assert.equal(quotaOwnerInput.providerSubmissionAuthorized, false);
});

test('merged provider-client and quota owner handoffs still do not make snsFandom a current Real Risk input', () => {
  const eligibility =
    RISK_ADJUSTMENT_CURRENT_UPSTREAM_ELIGIBILITY.find(
      (entry) => entry.variableId === 'snsFandomPoint',
    );

  assert.ok(eligibility);
  assert.equal(eligibility.acceptedForRiskConsumption, false);
  assert.equal(
    eligibility.exclusionReason,
    'sns-fandom-provider-and-product-gates-open',
  );
});
