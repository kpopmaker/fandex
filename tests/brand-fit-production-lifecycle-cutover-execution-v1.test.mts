import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptBrandFitPartnershipEvidence,
  type BrandFitPartnershipObservationInput,
} from '../lib/intelligence/brandFitPointConstruct';
import {
  adaptBrandFitPointToFandexVariableProduct,
} from '../lib/product/adapters/brandFitPointFandexVariableProduct';
import {
  BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_EXECUTION_APPROVAL,
  executeBrandFitProductionLifecycleCutover,
} from '../lib/product/activation/brandFitProductionLifecycleCutoverExecution';

function sourceRecord() {
  const observation: BrandFitPartnershipObservationInput = {
    eventId: 'brand-fit:youtube:39CUlBDuRSo',
    eventType: 'campaign-appearance',
    relationshipType: 'ambassador',
    explicitRelationshipClaim: true,
    identity: {
      canonicalArtistId: 'iu',
      canonicalBrandId: 'estee-lauder',
      canonicalCampaignId:
        'estee-lauder-korea-new-night-campaign-2025-iu',
      identityState: 'resolved',
    },
    source: {
      family: 'official-brand-youtube-video',
      reliability: 'primary-official',
      sourceUrl: 'https://www.youtube.com/watch?v=39CUlBDuRSo',
      sourcePublishedAt: '2025-08-04T02:30:02Z',
      rightsState: 'restricted',
    },
    time: {
      activityStartAt: null,
      activityEndAt: null,
      collectedAt: '2026-10-06T12:57:34Z',
    },
    revision: {
      revisionId:
        'd597ee9e419cb8c5cd71a2206cc2b33b11652caa20bea3ff1f0fed3b68f91f96',
      supersedesRevisionId: null,
    },
  };

  const evidence = adaptBrandFitPartnershipEvidence(observation);
  assert.equal(evidence.status, 'ok');
  if (evidence.status !== 'ok') {
    throw new Error('brand_fit_cutover_execution_evidence_invalid');
  }

  const product = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    evidence: [evidence.evidence],
  });
  assert.equal(product.status, 'ok');
  if (product.status !== 'ok') {
    throw new Error('brand_fit_cutover_execution_source_invalid');
  }

  return product.record;
}

test('Brand Fit lifecycle cutover execution is durably bound to owner approval', () => {
  assert.equal(
    BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_EXECUTION_APPROVAL
      .cutoverExecutionId,
    'ops-cutover-brand-fit-iu-20261007-v1',
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_EXECUTION_APPROVAL
      .approvedAt,
    '2026-10-07T12:37:07.000Z',
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_EXECUTION_APPROVAL
      .approvalEvidenceCommentId,
    6038050693,
  );
  assert.equal(
    BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_EXECUTION_APPROVAL
      .activationAuthorizationId,
    'ops-activation-brand-fit-20261007t014520z-v1',
  );
});

test('Brand Fit lifecycle cutover executes Research to Production only', () => {
  const source = sourceRecord();
  assert.equal(source.lifecycleState, 'research');

  const result = executeBrandFitProductionLifecycleCutover(source);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.lifecycleState, 'production');
  assert.equal(result.record.readinessState, 'production');
  assert.equal(result.record.materialClass, 'real');
  assert.equal(result.record.availability, 'available');
  assert.equal(result.record.valueRepresentation.kind, 'event');
  assert.equal(
    result.record.evidenceRefs.includes(
      'brand-fit-lifecycle-cutover-executed:true',
    ),
    true,
  );
  assert.equal(
    result.record.evidenceRefs.includes(
      'brand-fit-render-redeploy-executed:false',
    ),
    true,
  );
});

test('Brand Fit lifecycle cutover keeps publication, Risk, and numeric boundaries locked', () => {
  const result =
    executeBrandFitProductionLifecycleCutover(sourceRecord());
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  const serialized = JSON.stringify({
    record: result.record,
    execution: result.execution,
  });

  assert.equal(
    result.execution.executionBoundary.publicationAuthorized,
    false,
  );
  assert.equal(
    result.execution.executionBoundary.publicRouteCutoverAuthorized,
    false,
  );
  assert.equal(
    result.execution.executionBoundary.riskInventoryUpdated,
    false,
  );
  assert.equal(
    result.execution.executionBoundary.riskConsumptionAuthorized,
    false,
  );
  assert.equal(result.execution.executionBoundary.numericEligible, false);
  assert.equal(
    result.execution.executionBoundary.renderRedeployExecuted,
    false,
  );
  assert.equal(serialized.includes('"kind":"numeric"'), false);
  assert.equal(serialized.includes('"score"'), false);
  assert.equal(serialized.includes('"weight"'), false);
  assert.equal(serialized.includes('"penalty"'), false);
});

test('Brand Fit lifecycle cutover fails closed for a non-research source record', () => {
  const source = sourceRecord();
  const result = executeBrandFitProductionLifecycleCutover({
    ...source,
    lifecycleState: 'production',
    readinessState: 'production',
  });

  assert.deepEqual(result, {
    status: 'blocked',
    reason: 'source-record-not-research-real',
  });
});
