import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compareRankingFandexDesc,
  formatRankingFandexPoint,
  normalizeRankingFandexPoint,
} from '../app/ranking/rankingTruth';

test('ranking preserves an actual zero', () => {
  assert.equal(normalizeRankingFandexPoint(0), 0);
  assert.equal(formatRankingFandexPoint(0), '0pt');
});

test('ranking does not turn missing or invalid input into zero', () => {
  assert.equal(normalizeRankingFandexPoint(undefined), null);
  assert.equal(normalizeRankingFandexPoint(null), null);
  assert.equal(normalizeRankingFandexPoint(Number.NaN), null);
  assert.equal(formatRankingFandexPoint(null), '관측 없음');
});

test('ranking sorts missing after real numeric values', () => {
  const values = [null, 0, 42, -5];

  assert.deepEqual(
    [...values].sort(compareRankingFandexDesc),
    [42, 0, -5, null],
  );
});

test('two missing ranking values remain equal instead of becoming zero', () => {
  assert.equal(compareRankingFandexDesc(null, null), 0);
});