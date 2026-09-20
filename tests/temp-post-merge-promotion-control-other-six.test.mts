import assert from 'node:assert/strict';
import test from 'node:test';

import { getArtistProductVariable } from '../lib/product/queries/getArtistProductVariable';
import { getArtistProductVariableRealReadModel } from '../lib/product/queries/getArtistProductVariableRealReadModel';
import { PRODUCT_SAFE_VARIABLE_IDS } from '../lib/product/variables/productVariableDefinitions';

test('post-merge promotion control leaves all other six Product Variables unchanged Preview/Synthetic', async () => {
  const otherVariables = PRODUCT_SAFE_VARIABLE_IDS.filter(
    (variableId) => variableId !== 'newsIssuePoint',
  );
  assert.equal(otherVariables.length, 6);

  let realRuntimeCalls = 0;
  for (const variableId of otherVariables) {
    const legacy = getArtistProductVariable({ artistId: 'iu', variableId });
    const result = await getArtistProductVariableRealReadModel(
      {
        artistId: 'iu',
        variableId,
        throughSlotStart: '2026-09-20T09:00:00.000Z',
      },
      {
        readNewsIssuePointFrozenMethodology: async () => {
          realRuntimeCalls += 1;
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

  assert.equal(realRuntimeCalls, 0);
});
