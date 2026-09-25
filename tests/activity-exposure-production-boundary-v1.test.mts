import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('Activity Exposure Production candidate remains isolated from legacy numeric variable wiring', () => {
  const variableDefinitions = readFileSync(
    new URL('../lib/product/variables/productVariableDefinitions.ts', import.meta.url),
    'utf8',
  );
  const activityContract = readFileSync(
    new URL('../lib/product/contracts/productActivityExposure.ts', import.meta.url),
    'utf8',
  );

  assert.match(variableDefinitions, /'comebackActivityPoint'/);
  assert.doesNotMatch(activityContract, /ProductVariableReadModel/);
  assert.doesNotMatch(activityContract, /ProductNumericFact/);
  assert.doesNotMatch(activityContract, /comebackActivityPoint/);
});
