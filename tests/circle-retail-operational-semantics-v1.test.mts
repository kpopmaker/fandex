import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessCircleRetailPublishedChartCompleteness,
  CIRCLE_RETAIL_OPERATIONAL_EVIDENCE,
  classifyCircleRetailOperationalResponse,
} from '../lib/alternative-evidence/circleRetailOperationalSemantics';

function publishedRows(count = 50) {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => [String(index), {
    Album: `Album ${index + 1}`,
    Artist: `Artist ${index + 1}`,
    Barcode: `8800000000${String(index).padStart(3, '0')}`,
    rowSum: String(50000 - index),
    RankInt: String(index + 1),
    RankOrder: String(index + 1),
    YYYYMMDD: '20260529',
  }]));
}

const published = {
  FormToMap: { termGbn: 'day', yyyymmdd: '20260529' },
  ResultStatus: 'OK',
  List: publishedRows(),
};

const providerError = (yyyymmdd: string) => ({
  FormToMap: { termGbn: 'day', yyyymmdd },
  ResultStatus: 'Error',
});

test('published UI Top 50 response is classified as complete for the provider-displayed chart only', () => {
  const assessment = classifyCircleRetailOperationalResponse({ status: 200, rawResponse: published });
  assert.equal(assessment.resultClass, 'published-chart');
  assert.equal(assessment.providerStatus, 'OK');
  assert.equal(assessment.rowCount, 50);
  assert.equal(assessment.completeness, 'published-ui-top50-complete');
  assert.equal(CIRCLE_RETAIL_OPERATIONAL_EVIDENCE.marketUniverseCompletenessClaimed, false);
});

test('invalid, future and prelaunch periods collapse to the same provider error class', () => {
  for (const period of ['20260230', '20991231', '20000101']) {
    const assessment = classifyCircleRetailOperationalResponse({ status: 200, rawResponse: providerError(period) });
    assert.equal(assessment.resultClass, 'provider-period-error');
    assert.equal(assessment.providerStatus, 'Error');
    assert.equal(assessment.rowCount, 0);
    assert.equal(assessment.causeSpecificity, 'collapsed-provider-error');
  }
});

test('an explicit OK with empty List remains distinct from provider period error', () => {
  const assessment = classifyCircleRetailOperationalResponse({
    status: 200,
    rawResponse: { FormToMap: { termGbn: 'day', yyyymmdd: '20260101' }, ResultStatus: 'OK', List: {} },
  });
  assert.equal(assessment.resultClass, 'empty-ok-response');
  assert.equal(assessment.rowCount, 0);
});

test('49 rows or non-contiguous ranks do not claim published Top 50 completeness', () => {
  const short = { ...published, List: publishedRows(49) };
  assert.equal(assessCircleRetailPublishedChartCompleteness(short), 'unknown');

  const brokenRanks = {
    ...published,
    List: {
      ...published.List,
      49: { ...published.List['49'], RankInt: '51', RankOrder: '51' },
    },
  };
  assert.equal(assessCircleRetailPublishedChartCompleteness(brokenRanks), 'unknown');
});

test('HTTP and schema failures remain distinct from provider-period errors', () => {
  assert.equal(classifyCircleRetailOperationalResponse({ status: 500, rawResponse: {} }).resultClass, 'http-error');
  assert.equal(classifyCircleRetailOperationalResponse({ status: 200, rawResponse: '<html></html>' }).resultClass, 'schema-invalid');
});

test('bounded probe found no strict cookie or Referer requirement for the tested known period', () => {
  assert.equal(CIRCLE_RETAIL_OPERATIONAL_EVIDENCE.strictCookieRequirementObserved, false);
  assert.equal(CIRCLE_RETAIL_OPERATIONAL_EVIDENCE.strictRefererRequirementObserved, false);
  assert.equal(CIRCLE_RETAIL_OPERATIONAL_EVIDENCE.invalidFutureAndPrelaunchShareProviderErrorShape, true);
  assert.equal(CIRCLE_RETAIL_OPERATIONAL_EVIDENCE.uiPaginationParametersObserved, false);
  assert.equal(CIRCLE_RETAIL_OPERATIONAL_EVIDENCE.uiRendersEveryReturnedRow, true);
});
