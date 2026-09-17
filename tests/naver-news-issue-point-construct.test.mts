import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT,
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT_CONTRACT_VERSION,
  NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
} from '../lib/intelligence/naverNewsIssuePointConstruct';

test('newsIssuePoint construct, window, baseline, and normalization methodology are frozen', () => {
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.contractVersion,
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT_CONTRACT_VERSION,
  );
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT_CONTRACT_VERSION,
    'v4_naver_news_issue_point_construct',
  );
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.methodologyVersion,
    NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
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

test('8h is the frozen Product window by temporal-locality principle', () => {
  assert.deepEqual(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.candidateWindowSlotCounts, [8, 12]);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.windowSelectionStatus, 'frozen');
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.windowSelectionPrinciple,
    'preserve_current_state_temporal_locality',
  );
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.selectedWindowSlotCount, 8);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.selectedWindowDurationHours, 8);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.responsivenessPriority, true);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.persistenceAsSelectionObjective, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.smoothingAsSelectionObjective, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.automaticWindowFallbackAllowed, false);
});

test('baseline eligibility and membership are frozen without inventing a fixed baseline span', () => {
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineSufficiencyStatus, 'frozen');
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineWindowSlotCount, 8);
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineMembership,
    'all_prior_defined_rolling_windows_same_epoch_same_methodology_version',
  );
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineReadinessGate,
    'replicated_cycle_history',
  );
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.currentWindowIncludedInBaseline, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.bootstrapIncludedInBaseline, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.undefinedWindowIncludedInBaseline, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.crossEpochHistoryAllowed, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.crossMethodologyVersionHistoryAllowed, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.fixedBaselineSpanParameterAllowed, false);
});

test('strict-exceedance normalization is frozen while Product publication gates remain closed', () => {
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.normalizationStatus, 'frozen');
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.normalizationType,
    'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
  );
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.normalizationFormula,
    '100 * priorLessThanLatestCount / priorDefinedWindowCount',
  );
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.tieHandling,
    'included_in_denominator_excluded_from_numerator',
  );
  assert.deepEqual(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.scoreRange, [0, 100]);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.providerTotalNormalizationAllowed, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.stage1SyntheticFormulaAllowed, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.minMaxNormalizationAllowed, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.zScoreNormalizationAllowed, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.arbitraryMultiplierAllowed, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.productMethodologyFrozen, true);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.directProductContributionEligible, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.productScorePublished, false);
});
