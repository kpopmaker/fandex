import assert from 'node:assert/strict';
import test from 'node:test';

import {
  formatProductVariableFact,
  getArtistVariablePresentation,
} from '../lib/product/presentation/artistVariablePresentation';
import { getArtistProductVariable } from '../lib/product/queries/getArtistProductVariable';

test('variable presentation preserves available finite and zero values', () => {
  assert.equal(
    formatProductVariableFact({ availability: 'available', value: 72.8 }),
    '72.8',
  );
  assert.equal(
    formatProductVariableFact({ availability: 'available', value: 0 }),
    '0',
  );
});

test('variable presentation keeps missing and not-tracked distinct', () => {
  assert.equal(
    formatProductVariableFact({ availability: 'missing', value: null }),
    '관측 없음',
  );
  assert.equal(
    formatProductVariableFact({ availability: 'not-tracked', value: null }),
    '미추적',
  );
});

test('approved legacy-derived variable is visibly preview', () => {
  const presentation = getArtistVariablePresentation(
    getArtistProductVariable({
      artistId: 'aespa',
      variableId: 'newsIssuePoint',
    }),
  );

  assert.equal(presentation.state, 'available');
  assert.equal(presentation.showPreviewBadge, true);
});

test('invalid variable identity has a public-safe fail-closed label', () => {
  const presentation = getArtistVariablePresentation(
    getArtistProductVariable({
      artistId: 'aespa',
      variableId: '__invalid-variable__',
    }),
  );

  assert.deepEqual(presentation, {
    state: 'data-issue',
    valueText: '지원되지 않는 변수',
    showPreviewBadge: false,
  });
});
