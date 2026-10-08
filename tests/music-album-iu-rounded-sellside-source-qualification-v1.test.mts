import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createReportedAlbumSalesObservation } from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import { buildReportedAlbumSalesProductionEvidenceQualificationRequest, createReportedAlbumSalesProductionEvidenceQualificationBinding } from '../lib/alternative-evidence/reportedAlbumSalesProductionEvidenceQualification';
import { buildReportedAlbumSalesProductionSourceCandidate } from '../lib/alternative-evidence/reportedAlbumSalesProductionSource';

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

test('rounded Tier B sell-side evidence fails actual numeric production gate', () => {
  // Preserve the original chart precision: an exact integer observation and
  // an inclusive seven-day provider period are NOT present in this source.
  const observation = createReportedAlbumSalesObservation({
    canonicalArtistId: source.canonicalArtistId,
    artistName: 'IU',
    release: {
      canonicalReleaseId: null,
      identityState: 'candidate',
      releaseTitle: 'A Flower Bookmark 3',
      releaseDate: '2025-05-28',
      edition: null,
      skuOrBarcode: null,
      providerReleaseId: null,
    },
    metricSemantic: 'hanteo-first-week-sales',
    value: source.observedChart.exactPhysicalCopyValue,
    unit: 'physical-copies',
    providerPeriodStart: source.observedChart.explicitProviderPeriodStart,
    providerPeriodEnd: source.observedChart.explicitProviderPeriodEnd,
    observedAt: null,
    reportedAt: null,
    collectedAt: '2026-10-08T13:00:00+09:00',
    underlyingProvider: source.source.underlyingDataProvider,
    territory: null,
    format: 'physical-album',
    supportingEvidence: [{
      evidenceId: source.source.evidenceId,
      sourceTier: source.source.tier,
      reportingSource: source.source.issuer,
      sourceUrl: source.source.url,
      sourcePublicationDate: source.source.publishedDocumentDate,
      sourcePublishedAt: null,
      reportedAt: null,
      collectedAt: '2026-10-08T13:00:00+09:00',
      extractionMethod: 'manual-reviewed-web-research',
      underlyingProvider: source.source.underlyingDataProvider,
    }],
    lifecycle: 'research',
  });

  const request = buildReportedAlbumSalesProductionEvidenceQualificationRequest(observation);
  assert.equal(request.value, null);
  assert.equal(request.providerPeriodStart, null);
  assert.equal(request.providerPeriodEnd, null);
  const decision = (supportedClaims: Array<
    'exact-value' | 'explicit-provider-period' | 'underlying-provider'
  >) => ({
    requestId: request.requestId,
    evidenceId: source.source.evidenceId,
    supportedClaims,
    reviewEvidenceRefs: ['test:rounded-source-review'],
    reviewerRef: 'test:reviewer',
    reviewedAt: '2026-10-08T13:05:00+09:00',
  });

  // Merely marking the chart as Tier B and manually reviewing it
  // cannot manufacture an exact copy count or provider-period evidence.
  assert.throws(
    () => createReportedAlbumSalesProductionEvidenceQualificationBinding({
      request, decision: decision(['exact-value']),
    }),
    /exact_value_missing/,
  );
  assert.throws(
    () => createReportedAlbumSalesProductionEvidenceQualificationBinding({
      request, decision: decision(['explicit-provider-period']),
    }),
    /period_missing/,
  );

  // A reviewer may bind an underlying-provider attribution, but a partial
  // source claim must never qualify the numeric observation as Production.
  const providerOnly = createReportedAlbumSalesProductionEvidenceQualificationBinding({
    request, decision: decision(['underlying-provider']),
  });
  assert.equal(providerOnly.confirmedValue, null);
  assert.equal(providerOnly.confirmedProviderPeriodStart, null);
  assert.equal(providerOnly.confirmedProviderPeriodEnd, null);
  const candidate = buildReportedAlbumSalesProductionSourceCandidate({
    observation,
    asOfDate: '2026-10-08',
    evidenceQualifications: [providerOnly],
  });
  assert.equal(candidate.productSourceEligible, false);
  assert.equal(candidate.durableNormalizedStorageEligible, false);
  assert.equal(candidate.numericScoreProduced, false);
  assert.ok(candidate.blockers.includes('exact-value-unavailable'));
  assert.ok(candidate.blockers.includes('provider-period-incomplete'));
  assert.ok(candidate.blockers.includes('tier-a-or-b-exact-value-evidence-missing'));
  assert.ok(candidate.blockers.includes('tier-a-or-b-provider-period-evidence-missing'));
  assert.ok(candidate.blockers.includes('rights-commercial-use-not-authorized'));
});
