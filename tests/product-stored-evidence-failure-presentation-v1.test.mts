import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getStoredEvidenceFailurePresentation,
} from '../lib/product/presentation/storedEvidenceFailurePresentation';

test('Stored Evidence failure taxonomy reserves 404 semantics for trace not-found only', () => {
  assert.equal(
    getStoredEvidenceFailurePresentation([
      { code: 'job-not-in-variable-evidence-trace' },
    ]).kind,
    'not-found',
  );

  for (const code of [
    'variable-read-model-unavailable',
    'stored-evidence-read-failed',
  ] as const) {
    const presentation = getStoredEvidenceFailurePresentation([{ code }]);
    assert.equal(presentation.kind, 'load-error');
    assert.equal(presentation.title, 'Evidence를 불러올 수 없습니다.');
    assert.doesNotMatch(presentation.description, new RegExp(code));
  }

  for (const code of [
    'real-stored-evidence-trace-required',
    'stored-evidence-trace-inconsistent',
    'stored-evidence-source-mismatch',
  ] as const) {
    const presentation = getStoredEvidenceFailurePresentation([{ code }]);
    assert.equal(presentation.kind, 'verification-issue');
    assert.equal(presentation.title, 'Evidence를 확인할 수 없습니다.');
    assert.doesNotMatch(presentation.description, new RegExp(code));
  }
});
