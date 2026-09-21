import assert from 'node:assert/strict';
import test from 'node:test';

import { getArtistProductVariable } from '../lib/product/queries/getArtistProductVariable';
import { getArtistProductVariableRealReadModel } from '../lib/product/queries/getArtistProductVariableRealReadModel';
import { PRODUCT_SAFE_VARIABLE_IDS } from '../lib/product/variables/productVariableDefinitions';

test('approval-record integration leaves all other six Product Variables unchanged Preview/Synthetic', async () => {
  const variables = PRODUCT_SAFE_VARIABLE_IDS.filter(
    (variableId) => variableId !== 'newsIssuePoint',
  );
  assert.equal(variables.length, 6);

  let realCalls = 0;
  for (const variableId of variables) {
    const legacy = getArtistProductVariable({ artistId: 'iu', variableId });
    const result = await getArtistProductVariableRealReadModel(
      {
        artistId: 'iu',
        variableId,
        throughSlotStart: '2026-09-21T00:00:00.000Z',
      },
      {
        readNewsIssuePointFrozenMethodology: async () => {
          realCalls += 1;
          throw new Error('non-target Real runtime invoked');
        },
      },
    );
    assert.deepEqual(result, legacy);
    if (result.status === 'ok') {
      assert.equal(result.model.dataOrigin, 'synthetic');
      assert.equal(result.model.presentation, 'preview');
    }
  }

  assert.equal(realCalls, 0);
});
