import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT,
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT_CONTRACT_VERSION,
} from '../lib/intelligence/naverNewsIssuePointConstruct';

test('newsIssuePoint construct remains frozen while the Product window semantics are narrowed', () => {
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT.contractVersion,
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT_CONTRACT_VERSION,
  );
  assert.equal(
    NAVER_NEWS_ISSUE_POINT_CONSTRUCT_CONTRACT_VERSION,
    'v2_naver_news_issue_point_construct',
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

test('8h is the frozen Product window by temporal-locality principle while other methodology gates stay closed', () => {
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

  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineSufficiencyStatus, 'not_frozen');
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.normalizationStatus, 'not_frozen');
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.productMethodologyFrozen, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.directProductContributionEligible, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.productScorePublished, false);
});
