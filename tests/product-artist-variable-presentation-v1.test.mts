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

test('variable formatter preserves not-ranked and unavailable as distinct truth states', () => {
  assert.equal(
    formatProductVariableFact({ availability: 'not-ranked', value: null }),
    '\uC21C\uC704 \uC5C6\uC74C',
  );

  assert.equal(
    formatProductVariableFact({ availability: 'unavailable', value: null }),
    '\uC0AC\uC6A9 \uBD88\uAC00',
  );
});

test('variable card presentation does not collapse not-ranked or unavailable into data-issue', () => {
  const source = getArtistProductVariable({
    artistId: 'aespa',
    variableId: 'newsIssuePoint',
  });

  if (source.status !== 'ok') {
    assert.fail('Expected valid Product variable fixture.');
  }

  assert.deepEqual(
    getArtistVariablePresentation({
      status: 'ok',
      model: {
        ...source.model,
        fact: { availability: 'not-ranked', value: null },
      },
    }),
    {
      state: 'not-ranked',
      valueText: '\uC21C\uC704 \uC5C6\uC74C',
      showPreviewBadge: true,
    },
  );

  assert.deepEqual(
    getArtistVariablePresentation({
      status: 'ok',
      model: {
        ...source.model,
        fact: { availability: 'unavailable', value: null },
      },
    }),
    {
      state: 'unavailable',
      valueText: '\uC0AC\uC6A9 \uBD88\uAC00',
      showPreviewBadge: true,
    },
  );
});