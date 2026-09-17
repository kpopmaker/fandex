import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateAlbumNormalizationFreezeReadiness } from '../lib/alternative-evidence/albumProductionReadinessResearch';
import { ALBUM_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR } from '../lib/alternative-evidence/albumReleaseEligibilityResearch';
import {
  HANTEO_FIRST_WEEK_NORMALIZATION_FREEZE_INPUTS_RESEARCH,
  HANTEO_FIRST_WEEK_PRODUCTION_EVIDENCE_RESEARCH,
} from '../lib/alternative-evidence/hanteoFirstWeekProductionEvidenceResearch';

test('Hanteo first-week normalization has resolved internal definitions and provider-period semantics', () => {
  assert.equal(ALBUM_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR.productionRuleSelectedAtCanonicalLayer, true);
  assert.equal(HANTEO_FIRST_WEEK_PRODUCTION_EVIDENCE_RESEARCH.periodSemantics, 'verified');

  const readiness = evaluateAlbumNormalizationFreezeReadiness(
    HANTEO_FIRST_WEEK_NORMALIZATION_FREEZE_INPUTS_RESEARCH,
  );

  assert.equal(readiness.state, 'blocked');
  assert.deepEqual(readiness.blockers, [
    'normalization-source-authorization-unresolved',
  ]);
});
