import assert from 'node:assert/strict';
import test from 'node:test';

import {
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT,
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT_CONTRACT_VERSION,
} from '../lib/intelligence/naverNewsIssuePointConstruct';

test('newsIssuePoint construct is frozen without freezing Product publication methodology', () => {
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

test('only evidence-supported window candidates remain and all publication gates stay closed', () => {
  assert.deepEqual(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.candidateWindowSlotCounts, [8, 12]);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.windowSelectionStatus, 'not_frozen');
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.baselineSufficiencyStatus, 'not_frozen');
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.normalizationStatus, 'not_frozen');
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.productMethodologyFrozen, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.directProductContributionEligible, false);
  assert.equal(NAVER_NEWS_ISSUE_POINT_CONSTRUCT.productScorePublished, false);
});
