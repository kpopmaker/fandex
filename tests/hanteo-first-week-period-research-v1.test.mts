import test from 'node:test';
import assert from 'node:assert/strict';

import {
  HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR,
  buildHanteoFirstWeekNormalizationFreezeInputs,
} from '../lib/alternative-evidence/hanteoFirstWeekPeriodResearch';
import { evaluateAlbumNormalizationFreezeReadiness } from '../lib/alternative-evidence/albumProductionReadinessResearch';

test('Hanteo Initial Chodong period is release-relative seven calendar days in KST', () => {
  assert.equal(HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR.semantic, 'first-week-sale');
  assert.equal(HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR.periodTimezone, 'KST');
  assert.equal(HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR.calendarDayCount, 7);
  assert.equal(HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR.releaseRelative, true);
  assert.equal(HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR.calendarWeeklyChartEquivalent, false);
  assert.equal(HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR.providerPeriodDefinitionResolved, true);
});

test('normalization definition is reduced to source authorization only for Hanteo first-week semantics', () => {
  const readiness = evaluateAlbumNormalizationFreezeReadiness(buildHanteoFirstWeekNormalizationFreezeInputs());
  assert.equal(readiness.state, 'blocked');
  assert.deepEqual(readiness.blockers, ['normalization-source-authorization-unresolved']);
});

test('period evidence does not imply API authorization or revision contract', () => {
  assert.equal(HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR.apiAcquisitionRightsResolved, false);
  assert.equal(HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR.apiHistoricalQueryContractResolved, false);
  assert.equal(HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR.apiRevisionContractResolved, false);
});
