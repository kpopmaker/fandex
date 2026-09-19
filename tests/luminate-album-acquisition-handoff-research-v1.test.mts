import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assessLuminateAlbumAcquisitionHandoff,
  LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH,
} from '../lib/alternative-evidence/luminateAlbumAcquisitionHandoffResearch';

test('Snowflake Data Share is the preferred FANDEX acquisition surface', () => {
  const handoff = LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH;
  assert.equal(handoff.surfacePriority[0].surface, 'snowflake-data-share');
  assert.equal(handoff.surfacePriority[0].state, 'preferred-for-fandex-primary-anchor');
  assert.ok(handoff.surfacePriority[0].reasons.includes(
    'daily-fact-views-document-reported-quantity-without-luminate-modeling',
  ));
  assert.ok(handoff.surfacePriority[0].reasons.includes(
    'modified-at-supports-correction-reaggregation-lineage',
  ));
});

test('Music API remains secondary until raw-unit and correction reconstruction are verified in licensed access', () => {
  const api = LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH.surfacePriority[1];
  assert.equal(api.surface, 'music-api');
  assert.equal(api.state, 'conditional-secondary-path');
  assert.ok(api.unresolvedBeforePrimaryAnchorUse.includes(
    'licensed-response-must-preserve-provider-reported-physical-units-or-equivalent-unmodeled-field',
  ));
});

test('handoff asks for physical reported units and never modeled/equivalent substitutes', () => {
  const scope = LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH.requestedDataScope;
  assert.equal(scope.metricCategory, 'ProductSales');
  assert.equal(scope.distributionChannel, 'physical');
  assert.equal(scope.quantityField, 'REPORTED_QUANTITY');
  assert.equal(scope.modeledQuantityMaySubstitute, false);
  assert.equal(scope.equivalentQuantityMaySubstitute, false);
  assert.deepEqual(scope.temporalFieldsRequired, ['REPORT_DATE', 'MODIFIED_AT']);
});

test('initial acquisition targets are The Winning then Pieces', () => {
  const targets = LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH.firstAcquisitionTargets;
  assert.equal(targets[0].fandexReleaseId, 'research:iu:release:the-winning:2024-02-20');
  assert.equal(targets[1].fandexReleaseId, 'research:iu:release:pieces:2021-12-29');
});

test('manual sales handoff is ready but no automatic contact or purchase is allowed', () => {
  const handoff = LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH;
  const assessment = assessLuminateAlbumAcquisitionHandoff();
  assert.equal(handoff.automaticExternalContactAllowed, false);
  assert.equal(handoff.automaticPurchaseOrSubscriptionAllowed, false);
  assert.equal(assessment.state, 'ready-for-manual-sales-handoff');
  assert.equal(assessment.preferredSurface, 'snowflake-data-share');
  assert.deepEqual(assessment.internalBlockers, []);
});

test('derived-metric-only rights request excludes unused raw redistribution and ranking rights', () => {
  const excluded = LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH.explicitlyNotRequested;
  assert.ok(excluded.includes('raw-luminate-payload-redistribution'));
  assert.ok(excluded.includes('public-ranking-or-benchmarking-rights-for-derived-metric-only-output'));
  assert.ok(LUMINATE_ALBUM_ACQUISITION_HANDOFF_RESEARCH.orderFormOrSeparateWritingRequirements.includes(
    'public-publication-of-fandex-derived-metric-without-raw-luminate-content',
  ));
});
