import test from 'node:test';
import assert from 'node:assert/strict';

import { evaluateAlbumNormalizationFreezeReadiness } from '../lib/alternative-evidence/albumProductionReadinessResearch';
import { ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS } from '../lib/alternative-evidence/albumNormalizationResearch';
import { ALBUM_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR } from '../lib/alternative-evidence/albumReleaseEligibilityResearch';

test('internal normalization definitions are resolved and only external authorization/period blockers remain', () => {
  assert.equal(ALBUM_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR.productionRuleSelectedAtCanonicalLayer, true);

  const readiness = evaluateAlbumNormalizationFreezeReadiness({
    sourceAuthorizationResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.sourceAuthorizationResolved,
    providerPeriodDefinitionResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.providerPeriodDefinitionResolved,
    baselineDefinitionResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.baselineDefinitionResolved,
    crossReleaseComparabilityResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.crossReleaseComparabilityResolved,
    transformationRuleDefined: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.transformationRuleDefined,
    revisionPolicyResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.revisionPolicyResolved,
  });

  assert.equal(readiness.state, 'blocked');
  assert.deepEqual(readiness.blockers, [
    'normalization-source-authorization-unresolved',
    'normalization-provider-period-unresolved',
  ]);
});
