import test from 'node:test';
import assert from 'node:assert/strict';

import { artistUniverseV4 } from '../app/data/v4/artistUniverse';
import {
  buildAlbumArtistCatalogFromUniverse,
  type AlbumLiveIdentityRegistry,
} from '../lib/server/ingestion/albumLiveIdentityReconciliation';
import {
  extractConservativeProviderArtistLabelVariants,
  reconcileAlbumLiveIdentityWithLabelVariants,
} from '../lib/server/ingestion/albumLiveIdentityLabelVariants';

const catalog = buildAlbumArtistCatalogFromUniverse(artistUniverseV4);

function registry(overrides: Partial<AlbumLiveIdentityRegistry> = {}): AlbumLiveIdentityRegistry {
  return Object.freeze({
    artists: catalog,
    reviewedArtistMappings: Object.freeze([]),
    reviewedReleaseMappings: Object.freeze([]),
    ...overrides,
  });
}

function circleInput(artist: string) {
  return Object.freeze({
    provider: 'circle-retail' as const,
    providerArtistId: null,
    providerReleaseId: null,
    providerSkuId: '8800000000000',
    rawArtistText: artist,
    rawReleaseText: 'TEST ALBUM',
  });
}

test('extracts only full-string single parenthetical bilingual variants', () => {
  assert.deepEqual(
    extractConservativeProviderArtistLabelVariants('Stray Kids (스트레이 키즈)'),
    ['Stray Kids (스트레이 키즈)', 'Stray Kids', '스트레이 키즈'],
  );
  assert.deepEqual(
    extractConservativeProviderArtistLabelVariants('아일릿(ILLIT)'),
    ['아일릿(ILLIT)', '아일릿', 'ILLIT'],
  );
  assert.deepEqual(
    extractConservativeProviderArtistLabelVariants('NMIXX'),
    ['NMIXX'],
  );
  assert.deepEqual(
    extractConservativeProviderArtistLabelVariants('A (B) (C)'),
    ['A (B) (C)'],
  );
});

test('bilingual provider labels create machine candidates for known FANDEX artists', () => {
  const strayKids = reconcileAlbumLiveIdentityWithLabelVariants(
    circleInput('Stray Kids (스트레이 키즈)'),
    registry(),
  );
  assert.equal(strayKids.audit.status, 'artist-candidate-only');
  assert.deepEqual(strayKids.audit.artistCandidateIds, ['straykids']);
  assert.equal(strayKids.resolution.artistReviewState, 'machine-candidate');

  const illit = reconcileAlbumLiveIdentityWithLabelVariants(
    circleInput('아일릿(ILLIT)'),
    registry(),
  );
  assert.equal(illit.audit.status, 'artist-candidate-only');
  assert.deepEqual(illit.audit.artistCandidateIds, ['illit']);

  const lesserafim = reconcileAlbumLiveIdentityWithLabelVariants(
    circleInput('LE SSERAFIM (르세라핌)'),
    registry(),
  );
  assert.equal(lesserafim.audit.status, 'artist-candidate-only');
  assert.deepEqual(lesserafim.audit.artistCandidateIds, ['lesserafim']);
});

test('does not introduce substring, token containment, or fuzzy fallback', () => {
  for (const label of ['NMI', 'Stray', 'LE SSERA', 'ILL']) {
    const result = reconcileAlbumLiveIdentityWithLabelVariants(circleInput(label), registry());
    assert.equal(result.audit.status, 'no-match');
    assert.deepEqual(result.audit.artistCandidateIds, []);
  }
});

test('different exact candidates from outside and inside labels remain ambiguous', () => {
  const custom = registry({
    artists: Object.freeze([
      Object.freeze({ fandexArtistId: 'outside', canonicalName: 'Outside', aliases: Object.freeze(['ALPHA']) }),
      Object.freeze({ fandexArtistId: 'inside', canonicalName: 'Inside', aliases: Object.freeze(['BETA']) }),
    ]),
  });
  const result = reconcileAlbumLiveIdentityWithLabelVariants(circleInput('ALPHA (BETA)'), custom);
  assert.equal(result.audit.status, 'ambiguous');
  assert.deepEqual(result.audit.artistCandidateIds, ['inside', 'outside']);
  assert.equal(result.resolution.fandexArtistId, null);
});

test('label variants never broaden reviewed mapping semantics into resolved identity', () => {
  const result = reconcileAlbumLiveIdentityWithLabelVariants(
    circleInput('Stray Kids (스트레이 키즈)'),
    registry({
      reviewedArtistMappings: Object.freeze([
        Object.freeze({
          provider: 'circle-retail' as const,
          providerArtistId: null,
          providerArtistText: 'Stray Kids',
          fandexArtistId: 'straykids',
          reviewState: 'human-reviewed' as const,
          evidenceIds: Object.freeze(['review:test:straykids-short-label']),
        }),
      ]),
      reviewedReleaseMappings: Object.freeze([
        Object.freeze({
          provider: 'circle-retail' as const,
          providerReleaseId: null,
          providerSkuId: '8800000000000',
          providerReleaseText: 'TEST ALBUM',
          fandexArtistId: 'straykids',
          fandexReleaseId: 'release:test:straykids',
          fandexReleaseFamilyId: null,
          reviewState: 'human-reviewed' as const,
          evidenceIds: Object.freeze(['review:test:straykids-release']),
        }),
      ]),
    }),
  );

  assert.equal(result.audit.status, 'artist-candidate-only');
  assert.deepEqual(result.audit.artistCandidateIds, ['straykids']);
  assert.equal(result.resolution.artistReviewState, 'machine-candidate');
  assert.equal(result.resolution.fandexReleaseId, null);
});
