import assert from 'node:assert/strict';
import test from 'node:test';

import { getArtistV4ById } from '../app/data/v4/artistUniverse';
import {
  assessMusicChartSharedCanonicalBindings,
  MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION,
  type MusicChartCanonicalArtistRegistryLookup,
} from '../lib/alternative-evidence/musicChartCanonicalIdentityBinding';
import type { MusicChartCanonicalBinding } from '../lib/alternative-evidence/musicChartEvidenceAdapter';

const bindings: readonly MusicChartCanonicalBinding[] = Object.freeze([
  { canonicalArtistId: 'iu', artist: '아이유' },
  { canonicalArtistId: 'aespa', artist: '에스파' },
  { canonicalArtistId: 'ateez', artist: '에이티즈' },
  { canonicalArtistId: 'boynextdoor', artist: '보이넥스트도어' },
  { canonicalArtistId: 'ive', artist: '아이브' },
  { canonicalArtistId: 'lesserafim', artist: '르세라핌' },
  { canonicalArtistId: 'newjeans', artist: '뉴진스' },
  { canonicalArtistId: 'seventeen', artist: '세븐틴' },
  { canonicalArtistId: 'straykids', artist: '스트레이키즈' },
  { canonicalArtistId: 'txt', artist: '투모로우바이투게더' },
]);

test('actual Music collector bindings are checked against the shared v4 artist registry without label inference', () => {
  const assessment = assessMusicChartSharedCanonicalBindings(bindings);

  assert.equal(
    assessment.contractVersion,
    MUSIC_CHART_CANONICAL_IDENTITY_BINDING_VERSION,
  );
  assert.equal(assessment.entries.length, bindings.length);
  assert.equal(assessment.automaticArtistLabelResolutionAllowed, false);
  assert.equal(assessment.canonicalIdMutationAllowed, false);
  assert.equal(assessment.scoreFieldsPresent, false);

  const expectedIntegrated = bindings.every(binding => {
    const artist = getArtistV4ById(binding.canonicalArtistId);
    return artist?.collection.verificationStatus === 'verified';
  });

  assert.equal(
    assessment.productCanonicalIdentityIntegrated,
    expectedIntegrated,
  );
  assert.equal(
    assessment.integrationMode,
    expectedIntegrated ? 'shared-registry' : 'external-binding',
  );

  for (const binding of bindings) {
    const entry = assessment.entries.find(
      item => item.canonicalArtistId === binding.canonicalArtistId,
    );
    const registryArtist = getArtistV4ById(binding.canonicalArtistId);
    assert.ok(entry);
    assert.ok(registryArtist);
    assert.equal(entry.artistLabel, binding.artist);
    assert.equal(entry.registryArtistFound, true);
    assert.equal(
      entry.registryVerificationStatus,
      registryArtist.collection.verificationStatus,
    );
  }
});

test('verified shared-registry records are the only state that can emit shared-registry integration', () => {
  const verifiedLookup: MusicChartCanonicalArtistRegistryLookup = id => ({
    id,
    collection: { verificationStatus: 'verified' },
  });
  const assessment = assessMusicChartSharedCanonicalBindings(
    [{ canonicalArtistId: 'iu', artist: '아이유' }],
    verifiedLookup,
  );

  assert.equal(assessment.productCanonicalIdentityIntegrated, true);
  assert.equal(assessment.integrationMode, 'shared-registry');
  assert.deepEqual(assessment.blockers, []);
  assert.equal(assessment.entries[0]?.state, 'shared-registry-verified');
});

test('unverified registry records remain external-binding candidates rather than Product identity integration', () => {
  const unverifiedLookup: MusicChartCanonicalArtistRegistryLookup = id => ({
    id,
    collection: { verificationStatus: 'needs_verification' },
  });
  const assessment = assessMusicChartSharedCanonicalBindings(
    [{ canonicalArtistId: 'iu', artist: '아이유' }],
    unverifiedLookup,
  );

  assert.equal(assessment.productCanonicalIdentityIntegrated, false);
  assert.equal(assessment.integrationMode, 'external-binding');
  assert.equal(assessment.entries[0]?.state, 'shared-registry-unverified');
  assert.ok(
    assessment.blockers.includes(
      'shared-registry-artist-unverified:iu:needs_verification',
    ),
  );
});

test('missing canonical registry artist fails closed', () => {
  const missingLookup: MusicChartCanonicalArtistRegistryLookup = () => undefined;
  const assessment = assessMusicChartSharedCanonicalBindings(
    [{ canonicalArtistId: 'missing', artist: '없는아티스트' }],
    missingLookup,
  );

  assert.equal(assessment.productCanonicalIdentityIntegrated, false);
  assert.equal(assessment.integrationMode, 'external-binding');
  assert.equal(assessment.entries[0]?.state, 'shared-registry-missing');
  assert.deepEqual(
    assessment.blockers,
    ['shared-registry-artist-missing:missing'],
  );
});

test('duplicate canonical IDs or collector labels are rejected', () => {
  assert.throws(
    () => assessMusicChartSharedCanonicalBindings([
      { canonicalArtistId: 'iu', artist: '아이유' },
      { canonicalArtistId: 'iu', artist: '다른표기' },
    ]),
    /music_chart_shared_registry_binding_duplicate/,
  );

  assert.throws(
    () => assessMusicChartSharedCanonicalBindings([
      { canonicalArtistId: 'iu', artist: '아이유' },
      { canonicalArtistId: 'aespa', artist: '아이유' },
    ]),
    /music_chart_shared_registry_binding_duplicate/,
  );
});
