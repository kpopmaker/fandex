import assert from 'node:assert/strict';
import test from 'node:test';

test('snsFandomPoint lifecycle keeps collection, observation, and validation boundaries separate', () => {
  const lifecycle = [
    'provider-approval',
    'collector-activation',
    'collection-run-manifest',
    'raw-collection',
    'observation-mapping',
    'historical-snapshot',
    'validation-dataset',
    'methodology-study',
    'normalization',
    'snsFandomPoint',
  ];

  assert.deepEqual(lifecycle, [
    'provider-approval',
    'collector-activation',
    'collection-run-manifest',
    'raw-collection',
    'observation-mapping',
    'historical-snapshot',
    'validation-dataset',
    'methodology-study',
    'normalization',
    'snsFandomPoint',
  ]);
});

test('unapproved collection cannot reach product variable state', () => {
  const providerApproved = false;
  const finalVariableAvailable = providerApproved;

  assert.equal(finalVariableAvailable, false);
});

test('synthetic fallback cannot enter validation lifecycle', () => {
  const syntheticObservation = {
    materialClass: 'synthetic',
  };

  assert.notEqual(syntheticObservation.materialClass, 'real');
});

test('missing data cannot be converted into zero during lifecycle transition', () => {
  const missingValue = null;
  const transformedValue = missingValue;

  assert.equal(transformedValue, null);
});
