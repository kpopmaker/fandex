import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  FANDEX_VARIABLE_PRODUCT_IDS,
} from '../lib/product/contracts/fandexVariableProduct';
import {
  FANDEX_ARTIST_RUNTIME_BINDING_VERSION,
  inspectFandexArtistRuntimeBinding,
  resolveFandexArtistRuntimeInputs,
  type FandexArtistRuntimeLoaderMap,
} from '../lib/product/runtime/fandexArtistRuntimeBinding';

function completeRuntime(
  calls: string[] = [],
): FandexArtistRuntimeLoaderMap {
  return Object.freeze({
    musicAlbumPoint: async () => {
      calls.push('musicAlbumPoint');
      return undefined as never;
    },
    newsIssuePoint: async () => {
      calls.push('newsIssuePoint');
      return undefined as never;
    },
    snsFandomPoint: async () => {
      calls.push('snsFandomPoint');
      return undefined as never;
    },
    brandFitPoint: async () => {
      calls.push('brandFitPoint');
      return undefined as never;
    },
    comebackActivityPoint: async () => {
      calls.push('comebackActivityPoint');
      return undefined as never;
    },
    growthMomentumPoint: async () => {
      calls.push('growthMomentumPoint');
      return undefined as never;
    },
    riskAdjustmentPoint: async () => {
      calls.push('riskAdjustmentPoint');
      return undefined as never;
    },
  });
}

test('runtime binding readiness preserves the canonical seven-variable order', () => {
  const runtime: FandexArtistRuntimeLoaderMap = Object.freeze({
    musicAlbumPoint: null,
    newsIssuePoint: async () => undefined as never,
    snsFandomPoint: null,
    brandFitPoint: null,
    comebackActivityPoint: async () => undefined as never,
    growthMomentumPoint: async () => undefined as never,
    riskAdjustmentPoint: null,
  });

  const status = inspectFandexArtistRuntimeBinding({
    canonicalArtistId: 'iu',
    runtime,
  });

  assert.equal(
    status.contractVersion,
    FANDEX_ARTIST_RUNTIME_BINDING_VERSION,
  );
  assert.equal(status.ready, false);
  assert.deepEqual(status.boundVariableIds, [
    'newsIssuePoint',
    'comebackActivityPoint',
    'growthMomentumPoint',
  ]);
  assert.deepEqual(status.missingVariableIds, [
    'musicAlbumPoint',
    'snsFandomPoint',
    'brandFitPoint',
    'riskAdjustmentPoint',
  ]);
});

test('incomplete runtime fails closed before invoking any bound loader', async () => {
  const calls: string[] = [];
  const complete = completeRuntime(calls);
  const runtime: FandexArtistRuntimeLoaderMap = Object.freeze({
    ...complete,
    musicAlbumPoint: null,
  });

  const result = await resolveFandexArtistRuntimeInputs({
    canonicalArtistId: 'iu',
    runtime,
  });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;

  assert.equal(result.blocker, 'runtime-binding-incomplete');
  assert.deepEqual(result.binding.missingVariableIds, ['musicAlbumPoint']);
  assert.deepEqual(calls, []);
});

test('complete runtime resolves all inputs in canonical variable order', async () => {
  const calls: string[] = [];

  const result = await resolveFandexArtistRuntimeInputs({
    canonicalArtistId: ' iu ',
    runtime: completeRuntime(calls),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.binding.ready, true);
  assert.equal(result.orchestrationInput.canonicalArtistId, 'iu');
  assert.deepEqual(calls, FANDEX_VARIABLE_PRODUCT_IDS);
  assert.deepEqual(
    Object.keys(result.orchestrationInput).filter(
      (key) => key !== 'canonicalArtistId',
    ),
    FANDEX_VARIABLE_PRODUCT_IDS,
  );
});

test('runtime loader failure identifies the exact variable and stops later reads', async () => {
  const calls: string[] = [];
  const runtime = completeRuntime(calls);
  const failing: FandexArtistRuntimeLoaderMap = Object.freeze({
    ...runtime,
    snsFandomPoint: async () => {
      calls.push('snsFandomPoint');
      throw new Error('sns-runtime-read-failed');
    },
  });

  const result = await resolveFandexArtistRuntimeInputs({
    canonicalArtistId: 'iu',
    runtime: failing,
  });

  assert.equal(result.status, 'blocked');
  if (result.status !== 'blocked') return;

  assert.equal(result.blocker, 'runtime-loader-failed');
  assert.equal(result.failedVariableId, 'snsFandomPoint');
  assert.equal(result.detail, 'sns-runtime-read-failed');
  assert.deepEqual(calls, [
    'musicAlbumPoint',
    'newsIssuePoint',
    'snsFandomPoint',
  ]);
});

test('dependent runtime loader receives previously resolved canonical payloads', async () => {
  const seen: unknown[] = [];
  const runtime = completeRuntime();
  const dependent: FandexArtistRuntimeLoaderMap = Object.freeze({
    ...runtime,
    riskAdjustmentPoint: async (resolved) => {
      seen.push({
        hasNews: Object.prototype.hasOwnProperty.call(
          resolved,
          'newsIssuePoint',
        ),
        hasActivity: Object.prototype.hasOwnProperty.call(
          resolved,
          'comebackActivityPoint',
        ),
        hasRisk: Object.prototype.hasOwnProperty.call(
          resolved,
          'riskAdjustmentPoint',
        ),
      });
      return undefined as never;
    },
  });

  const result = await resolveFandexArtistRuntimeInputs({
    canonicalArtistId: 'iu',
    runtime: dependent,
  });

  assert.equal(result.status, 'ok');
  assert.deepEqual(seen, [{
    hasNews: true,
    hasActivity: true,
    hasRisk: false,
  }]);
});

test('IU server binding exposes all seven current runtime loaders', () => {
  const source = readFileSync(
    new URL(
      '../lib/server/product/fandexArtistEndToEndRuntime.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(
    source,
    /newsIssuePoint:\s*getNaverNewsIssuePointRealProductVariableAtLatestOfficialSlot/,
  );
  assert.match(
    source,
    /comebackActivityPoint:\s*getActivityExposurePublicRouteForIU/,
  );
  assert.match(
    source,
    /getMomentumEvidenceConsensusShadowProductForIU/,
  );
  assert.match(
    source,
    /getMomentumLiveShadowProductReadinessForIU/,
  );

  assert.match(
    source,
    /getMusicAlbumPointCurrentRuntimeForIU/,
  );
  assert.match(
    source,
    /getSnsFandomPointCurrentRuntimeForIU/,
  );
  assert.match(
    source,
    /deriveRiskAdjustmentCurrentRuntimeForIU/,
  );
  assert.match(
    source,
    /getBrandFitStoredEvidenceCurrentRuntimeForIU/,
  );

  for (const variableId of FANDEX_VARIABLE_PRODUCT_IDS) {
    assert.doesNotMatch(
      source,
      new RegExp(`${variableId}: null`),
    );
  }

  assert.doesNotMatch(source, /synthetic/i);
  assert.doesNotMatch(source, /previewFallback/i);
});
