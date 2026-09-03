import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const homeSource = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);
const dashboardSource = readFileSync(
  new URL(
    '../app/components/product/ProductDashboard.tsx',
    import.meta.url,
  ),
  'utf8',
);

test('canonical home route consumes only the Product Dashboard boundary', () => {
  assert.match(homeSource, /getProductDashboard/);
  assert.match(homeSource, /<ProductDashboard model=\{getProductDashboard\(\)\}/);
  assert.doesNotMatch(homeSource, /getKpopCompositeIndexSummary/);
  assert.doesNotMatch(homeSource, /getMarketIssueTopTen/);
  assert.doesNotMatch(homeSource, /getAllLatestArtistMetrics/);
  assert.doesNotMatch(homeSource, /artistIndexChartProfiles/);
});

test('Dashboard offers search, current-level disclosure, and canonical Artist links', () => {
  assert.match(dashboardSource, /K-pop 아티스트 데이터를 지표와 근거로 살펴보세요/);
  assert.match(dashboardSource, /아티스트 검색/);
  assert.match(dashboardSource, /현재 FANDEX/);
  assert.match(dashboardSource, /데이터 기준/);
  assert.match(dashboardSource, /href=\{`\/artists\/\$\{entry\.identity\.artistId\}`\}/);
  assert.match(dashboardSource, /아티스트 보기/);
  assert.match(dashboardSource, /미리보기/);
  assert.match(dashboardSource, /합성/);
});

test('Dashboard omits market, movement, prediction, and dashboard-news claims', () => {
  for (const forbiddenCopy of [
    'FANDEX K-pop 종합지수',
    'Market FANDEX',
    'Market Score',
    '시장 지수',
    'Top Rising',
    'Top Falling',
    '급상승',
    '급하락',
    '7D',
    '30D',
    '90D',
    '실시간',
    '가장 핫한',
    '핵심 상승주',
    '예측',
    '추천 투자',
    '신뢰도',
    'Verified',
    'Trusted',
  ]) {
    assert.equal(dashboardSource.includes(forbiddenCopy), false);
  }

  assert.doesNotMatch(dashboardSource, /getMarketIssueTopTen/);
  assert.doesNotMatch(dashboardSource, /Evidence.*carousel/i);
});

test('Dashboard has neutral empty/error copy and mobile-safe layout classes', () => {
  assert.match(dashboardSource, /표시할 아티스트가 없습니다/);
  assert.match(dashboardSource, /검색 결과가 없습니다/);
  assert.match(dashboardSource, /데이터 확인 필요|presentation\.valueText/);
  assert.match(dashboardSource, /w-full/);
  assert.match(dashboardSource, /grid-cols-1/);
  assert.match(dashboardSource, /sm:grid-cols-2/);
  assert.match(dashboardSource, /min-w-0/);
  assert.match(dashboardSource, /min-h-11/);
});
