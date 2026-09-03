import assert from 'node:assert/strict';
import test from 'node:test';

import { artistIndexChartProfiles } from '../app/data/v4/charts/artistIndexChartData';
import { getArtistRecentIssueSignals } from '../app/data/v4/charts/issueSignals';
import type { ProductEvidenceReadModelResult } from '../lib/product/contracts/productEvidence';
import {
  getArtistProductEvidence,
  getArtistProductEvidenceStaticParams,
  validateProductEvidenceId,
} from '../lib/product/queries/getArtistProductEvidence';
import { getArtistProductVariableEvidence } from '../lib/product/queries/getArtistProductVariableEvidence';
import { PRODUCT_SAFE_VARIABLE_IDS } from '../lib/product/variables/productVariableDefinitions';

function requireEvidence(result: ProductEvidenceReadModelResult) {
  if (result.status !== 'ok') {
    assert.fail(
      `Expected Product Evidence, received ${result.issues
        .map((issue) => issue.code)
        .join(', ')}.`,
    );
  }

  return result.model;
}

test('artist issue identity is stable, exact, and globally collision-free', () => {
  assert.deepEqual(validateProductEvidenceId(' aespa-issue-09 '), {
    status: 'valid',
    evidenceId: 'aespa-issue-09',
    sourceArtistId: 'aespa',
  });
  assert.deepEqual(validateProductEvidenceId('aespa-issue-00'), {
    status: 'invalid',
    rawEvidenceId: 'aespa-issue-00',
  });
  assert.deepEqual(validateProductEvidenceId('market-01'), {
    status: 'invalid',
    rawEvidenceId: 'market-01',
  });

  const identities = getArtistProductEvidenceStaticParams();
  const ids = identities.map((identity) => identity.evidenceId);

  assert.equal(ids.length, artistIndexChartProfiles.length * 10);
  assert.equal(new Set(ids).size, ids.length);
});

test('invalid evidence identity fails before any source runtime is called', () => {
  let callCount = 0;
  const result = getArtistProductEvidence(
    { artistId: 'aespa', evidenceId: '__invalid-evidence__' },
    {
      getArtistProfile: () => {
        callCount += 1;
        throw new Error('Invalid identity reached the source runtime.');
      },
      getArtistIssueSignals: () => {
        callCount += 1;
        throw new Error('Invalid identity reached the source runtime.');
      },
    },
  );

  assert.equal(callCount, 0);
  assert.deepEqual(result, {
    status: 'data-issue',
    issues: [{ code: 'invalid-evidence-identity' }],
  });
});

test('valid identity resolves the exact source item without first-item fallback', () => {
  const source = getArtistRecentIssueSignals('aespa', 100)[8];
  assert.ok(source);
  const evidence = requireEvidence(
    getArtistProductEvidence({
      artistId: 'aespa',
      evidenceId: 'aespa-issue-09',
    }),
  );

  assert.equal(evidence.identity.evidenceId, source.id);
  assert.equal(evidence.title, source.title);
  assert.equal(evidence.summary, source.summary);
  assert.equal(evidence.relation.relatedSourceVariableKey, 'newsIssuePoint');

  const missing = getArtistProductEvidence({
    artistId: 'aespa',
    evidenceId: 'aespa-issue-10',
  });
  assert.equal(missing.status, 'ok');

  const otherArtist = getArtistProductEvidence({
    artistId: 'ive',
    evidenceId: 'aespa-issue-09',
  });
  assert.deepEqual(otherArtist, {
    status: 'data-issue',
    issues: [{ code: 'artist-evidence-mismatch' }],
  });

  const profile = artistIndexChartProfiles.find(
    (candidate) => candidate.artistId === 'aespa',
  );
  assert.ok(profile);
  const firstOnlyRuntimeResult = getArtistProductEvidence(
    { artistId: 'aespa', evidenceId: 'aespa-issue-09' },
    {
      getArtistProfile: () => profile,
      getArtistIssueSignals: () => [
        getArtistRecentIssueSignals('aespa', 100)[0]!,
      ],
    },
  );
  assert.deepEqual(firstOnlyRuntimeResult, {
    status: 'data-issue',
    issues: [{ code: 'evidence-not-found' }],
  });
});

test('every Product-safe variable receives only directly related evidence', () => {
  for (const variableId of PRODUCT_SAFE_VARIABLE_IDS) {
    const collection = getArtistProductVariableEvidence({
      artistId: 'aespa',
      variableId,
    });

    assert.equal(collection.status, 'ok');
    if (collection.status !== 'ok') continue;
    assert.ok(collection.items.length > 0);
    assert.equal(
      collection.items.every(
        (item) => item.relation.relatedSourceVariableKey === variableId,
      ),
      true,
    );
  }
});

test('cross-variable and cross-artist evidence leakage is blocked', () => {
  const newsCollection = getArtistProductVariableEvidence({
    artistId: 'aespa',
    variableId: 'newsIssuePoint',
  });
  const fandomCollection = getArtistProductVariableEvidence({
    artistId: 'aespa',
    variableId: 'snsFandomPoint',
  });
  const iveNewsCollection = getArtistProductVariableEvidence({
    artistId: 'ive',
    variableId: 'newsIssuePoint',
  });

  assert.equal(newsCollection.status, 'ok');
  assert.equal(fandomCollection.status, 'ok');
  assert.equal(iveNewsCollection.status, 'ok');
  if (
    newsCollection.status !== 'ok' ||
    fandomCollection.status !== 'ok' ||
    iveNewsCollection.status !== 'ok'
  ) {
    return;
  }

  assert.deepEqual(
    newsCollection.items.map((item) => item.identity.evidenceId),
    ['aespa-issue-09'],
  );
  assert.equal(
    fandomCollection.items.some(
      (item) => item.identity.evidenceId === 'aespa-issue-09',
    ),
    false,
  );
  assert.deepEqual(
    iveNewsCollection.items.map((item) => item.identity.evidenceId),
    ['ive-issue-09'],
  );
});

test('preview, synthetic, and source-native time truth remain distinct', () => {
  const evidence = requireEvidence(
    getArtistProductEvidence({
      artistId: 'aespa',
      evidenceId: 'aespa-issue-09',
    }),
  );

  assert.equal(evidence.presentation, 'preview');
  assert.equal(evidence.dataOrigin, 'synthetic');
  assert.deepEqual(evidence.time.observationTime, { kind: 'unknown' });
  assert.equal(evidence.time.sourceTimeLabel, '최근 시드 9');
  assert.equal('providerPeriod' in evidence.time, false);
  assert.equal('sourceUrl' in evidence.source, false);
});

test('invalid variable and unknown artist collections fail closed', () => {
  const invalidVariable = getArtistProductVariableEvidence({
    artistId: 'aespa',
    variableId: '__invalid-variable__',
  });
  const unknownArtist = getArtistProductVariableEvidence({
    artistId: '__unknown-artist__',
    variableId: 'newsIssuePoint',
  });

  assert.deepEqual(invalidVariable, {
    status: 'data-issue',
    artistId: 'aespa',
    rawVariableId: '__invalid-variable__',
    issues: [{ code: 'invalid-variable-identity' }],
  });
  assert.deepEqual(unknownArtist, {
    status: 'data-issue',
    artistId: '__unknown-artist__',
    rawVariableId: 'newsIssuePoint',
    issues: [{ code: 'artist-not-found' }],
  });
});
