import assert from 'node:assert/strict';
import test from 'node:test';

import {
  artistIndexChartProfiles,
  artistStockVariableKeys,
  type ArtistIndexChartProfile,
  type ArtistIndexHistoryPoint,
} from '../app/data/v4/charts/artistIndexChartData';
import { getArtistRecentIssueSignals } from '../app/data/v4/charts/issueSignals';
import { FANDEX_METRIC_DEFINITIONS } from '../app/data/v4/metrics/fandexMetricDefinitions';
import type {
  ProductVariableReadModelResult,
} from '../lib/product/contracts/productVariable';
import {
  getArtistProductVariable,
  type ProductVariableRuntime,
} from '../lib/product/queries/getArtistProductVariable';
import {
  PRODUCT_SAFE_VARIABLE_IDS,
  PRODUCT_VARIABLE_DEFINITIONS,
  validateProductVariableId,
} from '../lib/product/variables/productVariableDefinitions';

const ARTIST_ID = 'aespa';
const VARIABLE_ID = 'newsIssuePoint';

function requireModel(result: ProductVariableReadModelResult) {
  if (result.status !== 'ok') {
    assert.fail(
      `Expected Product Variable model, received ${result.issues
        .map((issue) => issue.code)
        .join(', ')}.`,
    );
  }

  return result.model;
}

function getProfile() {
  const profile = artistIndexChartProfiles.find(
    (candidate) => candidate.artistId === ARTIST_ID,
  );
  assert.ok(profile);
  return profile;
}

function makeRuntimeWithLatestValue(value: unknown): ProductVariableRuntime {
  const sourceProfile = getProfile();
  const history = sourceProfile.history.map((point) => ({ ...point }));
  const latest = history.at(-1);
  assert.ok(latest);

  if (value === undefined) {
    delete (latest as unknown as Record<string, unknown>)[VARIABLE_ID];
  } else {
    (latest as unknown as Record<string, unknown>)[VARIABLE_ID] = value;
  }

  const profile: ArtistIndexChartProfile = { ...sourceProfile, history };
  return Object.freeze({ getArtistProfile: () => profile });
}

test('Product registry explicitly approves every seven-key legacy candidate', () => {
  assert.deepEqual([...PRODUCT_SAFE_VARIABLE_IDS], artistStockVariableKeys);
  assert.equal(PRODUCT_VARIABLE_DEFINITIONS.length, 7);
  assert.equal(new Set(PRODUCT_SAFE_VARIABLE_IDS).size, 7);
});

test('Product definitions preserve every proven metric relation without collapsing one-to-many links', () => {
  for (const definition of PRODUCT_VARIABLE_DEFINITIONS) {
    const expectedMetricKeys = FANDEX_METRIC_DEFINITIONS.filter(
      (metric) => metric.legacyChartKey === definition.sourceKey,
    ).map((metric) => metric.key);

    assert.deepEqual(definition.relatedSourceMetricKeys, expectedMetricKeys);
  }

  assert.deepEqual(
    PRODUCT_VARIABLE_DEFINITIONS.find(
      (definition) => definition.variableId === 'musicAlbumPoint',
    )?.relatedSourceMetricKeys,
    ['music', 'album'],
  );
  assert.deepEqual(
    PRODUCT_VARIABLE_DEFINITIONS.find(
      (definition) => definition.variableId === 'snsFandomPoint',
    )?.relatedSourceMetricKeys,
    ['sns', 'fandom'],
  );
});

test('every approved identity has an existing issue-signal lineage key', () => {
  const issueKeys = new Set(
    getArtistRecentIssueSignals(ARTIST_ID, 100).map(
      (issue) => issue.relatedVariableKey,
    ),
  );

  for (const definition of PRODUCT_VARIABLE_DEFINITIONS) {
    assert.equal(definition.evidenceRelation.kind, 'legacy-issue-signal-key');
    assert.equal(issueKeys.has(definition.evidenceRelation.sourceKey), true);
  }
});

test('invalid identity fails closed before the legacy profile runtime is called', () => {
  let runtimeCallCount = 0;
  const runtime: ProductVariableRuntime = {
    getArtistProfile: () => {
      runtimeCallCount += 1;
      throw new Error('Invalid Product Variable identity reached runtime.');
    },
  };
  const result = getArtistProductVariable(
    { artistId: ARTIST_ID, variableId: '__invalid-variable__' },
    runtime,
  );

  assert.equal(runtimeCallCount, 0);
  assert.equal(result.status, 'data-issue');
  assert.deepEqual(
    result.status === 'data-issue' ? result.issues : [],
    [
      {
        code: 'invalid-variable-identity',
        rawVariableId: '__invalid-variable__',
      },
    ],
  );
  assert.deepEqual(validateProductVariableId(' musicAlbumPoint '), {
    status: 'valid',
    variableId: 'musicAlbumPoint',
  });
});

test('finite source value stays exact and remains a preview synthetic fact', () => {
  const sourceProfile = getProfile();
  const sourcePoint = sourceProfile.history.at(-1);
  assert.ok(sourcePoint);
  const model = requireModel(
    getArtistProductVariable({ artistId: ARTIST_ID, variableId: VARIABLE_ID }),
  );

  assert.deepEqual(model.fact, {
    availability: 'available',
    value: sourcePoint[VARIABLE_ID],
  });
  assert.equal(model.presentation, 'preview');
  assert.equal(model.dataOrigin, 'synthetic');
  assert.deepEqual(model.observationTime, { kind: 'unknown' });
  assert.equal(model.sourceMetadata.sourceTimeLabel, sourcePoint.date);
});

test('zero is available zero and missing remains missing instead of zero', () => {
  const zeroModel = requireModel(
    getArtistProductVariable(
      { artistId: ARTIST_ID, variableId: VARIABLE_ID },
      makeRuntimeWithLatestValue(0),
    ),
  );
  const missingModel = requireModel(
    getArtistProductVariable(
      { artistId: ARTIST_ID, variableId: VARIABLE_ID },
      makeRuntimeWithLatestValue(undefined),
    ),
  );

  assert.deepEqual(zeroModel.fact, { availability: 'available', value: 0 });
  assert.deepEqual(missingModel.fact, { availability: 'missing', value: null });
  assert.deepEqual(zeroModel.series.at(-1)?.fact, {
    availability: 'available',
    value: 0,
  });
  assert.deepEqual(missingModel.series.at(-1)?.fact, {
    availability: 'missing',
    value: null,
  });
});

test('non-finite source value is a data issue instead of missing', () => {
  for (const invalidValue of [Number.NaN, Infinity, -Infinity]) {
    const result = getArtistProductVariable(
      { artistId: ARTIST_ID, variableId: VARIABLE_ID },
      makeRuntimeWithLatestValue(invalidValue),
    );

    assert.equal(result.status, 'data-issue');
    assert.deepEqual(
      result.status === 'data-issue' ? result.issues : [],
      [{ code: 'invalid-source-value', sourceTimeLabel: '26.07' }],
    );
  }
});

test('untracked artist stays not-tracked and source labels remain source-native', () => {
  const untrackedModel = requireModel(
    getArtistProductVariable({
      artistId: '__untracked-artist__',
      variableId: VARIABLE_ID,
    }),
  );
  const trackedModel = requireModel(
    getArtistProductVariable({ artistId: ARTIST_ID, variableId: VARIABLE_ID }),
  );

  assert.deepEqual(untrackedModel.fact, {
    availability: 'not-tracked',
    value: null,
  });
  assert.deepEqual(untrackedModel.series, []);
  assert.deepEqual(
    trackedModel.series.map((point) => point.sourceTimeLabel),
    getProfile().history.map((point: ArtistIndexHistoryPoint) => point.date),
  );
  assert.equal(
    trackedModel.series.some((point) => point.sourceTimeLabel.includes('-01')),
    false,
  );
});

test('profile identity conflict fails closed', () => {
  const mismatchedProfile = { ...getProfile(), artistId: 'other-artist' };
  const result = getArtistProductVariable(
    { artistId: ARTIST_ID, variableId: VARIABLE_ID },
    { getArtistProfile: () => mismatchedProfile },
  );

  assert.equal(result.status, 'data-issue');
  assert.deepEqual(
    result.status === 'data-issue' ? result.issues : [],
    [
      {
        code: 'source-state-conflict',
        reason: 'artist-identity-mismatch',
      },
    ],
  );
});
