import test from 'node:test';
import assert from 'node:assert/strict';

import { HANTEO_REVISION_SEMANTICS_RESEARCH_DESCRIPTOR } from '../lib/alternative-evidence/hanteoRevisionSemanticsResearch';

test('official public notices establish correction behavior without inventing an API revision contract', () => {
  assert.equal(HANTEO_REVISION_SEMANTICS_RESEARCH_DESCRIPTOR.publicCorrectionBehaviorVerified, true);
  assert.equal(HANTEO_REVISION_SEMANTICS_RESEARCH_DESCRIPTOR.publishedSalesMayBeCorrected, true);
  assert.equal(HANTEO_REVISION_SEMANTICS_RESEARCH_DESCRIPTOR.fandexRevisionPolicy, 'corrected-value-supersedes-prior-value');
  assert.equal(HANTEO_REVISION_SEMANTICS_RESEARCH_DESCRIPTOR.correctionIsNewIndependentObservation, false);
  assert.equal(HANTEO_REVISION_SEMANTICS_RESEARCH_DESCRIPTOR.apiRevisionIdentifierVerified, false);
  assert.equal(HANTEO_REVISION_SEMANTICS_RESEARCH_DESCRIPTOR.apiSupersessionFieldVerified, false);
  assert.equal(HANTEO_REVISION_SEMANTICS_RESEARCH_DESCRIPTOR.apiCorrectionDeliveryMechanismVerified, false);
  assert.equal(HANTEO_REVISION_SEMANTICS_RESEARCH_DESCRIPTOR.productionApiRevisionContractResolved, false);
});
