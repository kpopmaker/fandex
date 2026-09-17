import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT,
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT_CONTRACT_VERSION,
} from '../lib/intelligence/naverNewsIssuePointConstruct';

test('newsIssuePoint construct and temporal semantics stay frozen', () => {
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.contractVersion,
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT_CONTRACT_VERSION,
  );
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.variableId, 'newsIssuePoint');
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.constructStatus, 'frozen');
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.lifecycle, 'research');
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.sourceMetricKey,
    'naverNewsShadowFirstSeenActivity',
  );
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.construct,
    'protocol_conditioned_first_seen_canonical_media_activity',
  );
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineScope,
    'same_artist_same_official_shadow_epoch',
  );
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.activityBucketTimeBasis, 'collection_slot');
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.observationTimeSource, 'normalized_published_at');
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.collectionTimeSource, 'stored_evidence_collected_at');
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.bootstrapExcluded, true);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.missingOrGapAsZeroAllowed, false);
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.strictPublicationIntervalArticleCountClaimAllowed,
    false,
  );
});

test('Product window and baseline sufficiency are frozen without opening publication', () => {
  assert.deepEqual(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.researchCandidateWindowSlotCounts,
    [8, 12],
  );
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.productWindowSlotCount, 8);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.windowSelectionStatus, 'frozen');

  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineReferenceMembershipUnit,
    'defined_rolling_8h_window',
  );
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineSufficiencyStatus, 'frozen');
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineSufficiencyRule,
    'single_cycle_independent_historical_reference_eligibility',
  );
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineSufficiencyEvaluation
      .nonOverlappingProductWindowSupportRequired,
    true,
  );
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineSufficiencyEvaluation
      .leaveOneCompleteDiurnalCycleOutRequired,
    true,
  );
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineSufficiencyEvaluation
      .residualReferenceRequirement,
    'complete_diurnal_cycle_support',
  );
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineSufficiencyEvaluation
      .overlappingRollingWindowsCountAsIndependentSamples,
    false,
  );
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineSufficiencyEvaluation
      .fixedHistorySlotThresholdRequired,
    false,
  );

  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.normalizationStatus, 'not_frozen');
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.productMethodologyFrozen, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.directProductContributionEligible, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.productScorePublished, false);
});
