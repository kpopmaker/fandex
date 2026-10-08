import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = JSON.parse(readFileSync(
  'data/fandex-cloud-v10/product/iu_music_album_rounded_sellsider_research_source_v1.json',
  'utf8',
));
const audit = JSON.parse(readFileSync(
  'data/fandex-cloud-v10/product/iu_music_album_first_week_source_search_audit_v1.json',
  'utf8',
));

test('independent rounded sell-side figure is a source lead, not an exact IU album observation', () => {
  assert.equal(source.contractVersion, 'iu-music-album-rounded-sellside-source-qualification-v1');
  assert.equal(source.canonicalArtistId, 'iu');
  assert.equal(source.targetReleaseId, 'release:iu:a-flower-bookmark-3:2025-05-28');
  assert.equal(source.source.issuer, 'Daishin Securities Research Center');
  assert.equal(source.source.underlyingDataProvider, 'Hanteo Chart');
  assert.equal(source.source.tier, 'tier-b-provider-attributed-reputable');
  assert.equal(source.source.pdfPageIndex, 4);
  assert.equal(source.source.figureNumber, 18);
  assert.equal(source.observedChart.artistLabel, '아이유');
  assert.equal(source.observedChart.displayedNumber, 7.2);
  assert.equal(source.observedChart.unit, 'ten-thousand-copies');
  assert.equal(source.observedChart.displayPrecision, 'one-decimal-rounded');
  assert.equal(source.observedChart.exactPhysicalCopyValue, null);
  assert.equal(source.observedChart.explicitAlbumReleaseBinding, false);
  assert.equal(source.observedChart.explicitProviderPeriodStart, null);
  assert.equal(source.observedChart.explicitProviderPeriodEnd, null);
  assert.equal(source.observedChart.explicitSevenDayClaimBoundToFigure, false);
  assert.equal(source.qualification.qualifyingExactAlbumValue, false);
  assert.equal(source.qualification.qualifyingSevenDayProviderPeriod, false);
  assert.equal(source.qualification.eligibleAsExactReportedHanteoFirstWeekObservation, false);
  assert.equal(source.qualification.canInferExactValueByScaling, false);
});

test('finding a Tier B source cannot qualify a separate Tier C first-week total', () => {
  assert.equal(audit.result.discoveryExactValue, 79940);
  assert.equal(audit.result.tierAOrBExactValueSourceLocated, false);
  assert.equal(audit.result.tierAOrBExactValueAndPeriodBindingLocated, false);
  assert.equal(audit.result.productionObservationEligible, false);
  assert.equal(audit.roundedSellsideSourceFollowUp.sourceEvidenceId, source.source.evidenceId);
  assert.equal(audit.roundedSellsideSourceFollowUp.qualifiesExactFirstWeekClaim, false);
  assert.equal(audit.roundedSellsideSourceFollowUp.qualifiesExplicitProviderPeriod, false);
  assert.equal(audit.roundedSellsideSourceFollowUp.outreachSent, false);
  assert.equal(source.qualification.qualifiesDiscoveryOnly79940, false);
  assert.equal(source.qualification.canReplaceDiscoveryValue, false);
});

test('rights, durable writes, public score and evidence redistribution remain blocked', () => {
  assert.equal(source.source.fullPdfOrChartStored, false);
  assert.equal(source.qualification.sourceSpecificRightsReviewState, 'review-required');
  for (const field of [
    'normalizedStorageUseAuthorized',
    'commercialUseAuthorized',
    'derivedPublicationAuthorized',
    'productionDurableWriteAuthorized',
    'numericProductEligible',
    'methodologyLockAuthorized',
    'productActivationAuthorized',
  ]) assert.equal(source.qualification[field], false, field);
  assert.equal(source.noOutreachPerformed, true);
});
