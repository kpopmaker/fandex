import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildMusicAlbumVerifiedReleaseIdentity,
} from '../lib/product/presentation/musicAlbumVerifiedReleaseIdentity';

const binding = JSON.parse(readFileSync(
  'data/fandex-cloud-v10/product/iu_music_album_current_release_binding_v1.json',
  'utf8',
));

test('human-reviewed release identity is Product contextual metadata only, not album sales', () => {
  const result = buildMusicAlbumVerifiedReleaseIdentity({
    binding,
    expectedCanonicalArtistId: 'iu',
  });
  assert.equal(result.status, 'verified-identity-only');
  if (result.status !== 'verified-identity-only') return;
  assert.equal(result.canonicalReleaseId, 'release:iu:a-flower-bookmark-3:2025-05-28');
  assert.equal(result.releaseTitle, 'A Flower Bookmark 3');
  assert.equal(result.physicalReleaseDate, '2025-05-28');
  assert.equal(result.editionResolutionState, 'release-level');
  assert.equal(result.firstWeekExactCopies, null);
  assert.equal(result.firstWeekProviderPeriodStart, null);
  assert.equal(result.firstWeekProviderPeriodEnd, null);
  assert.equal(result.firstWeekQualification, 'not-established-by-release-identity');
  assert.equal(result.productValue, null);
  assert.equal(result.numericScoreDefined, false);
  assert.equal(result.salesProductionActivationAuthorized, false);
  assert.equal(result.salesPublicPublicationAuthorized, false);
  assert.ok(result.evidenceRefs.includes('kakaoent-newsroom:2025-05-27:a-flower-bookmark-3'));
  assert.equal(JSON.stringify(result).includes('79940'), false);
});

test('tampering, absent binding, or wrong artist blocks metadata exposure', () => {
  assert.equal(buildMusicAlbumVerifiedReleaseIdentity({
    binding: {...binding, releaseTitle: 'Forged'},
    expectedCanonicalArtistId: 'iu',
  }).status, 'blocked');
  assert.equal(buildMusicAlbumVerifiedReleaseIdentity({
    binding: null,
    expectedCanonicalArtistId: 'iu',
  }).status, 'blocked');
  assert.equal(buildMusicAlbumVerifiedReleaseIdentity({
    binding,
    expectedCanonicalArtistId: 'other-artist',
  }).status, 'blocked');
});

test('beta page renders identity-only context without presenting Tier C copies as Production', () => {
  const page = readFileSync('app/artists/[artistId]/fandex-beta/page.tsx', 'utf8');
  assert.match(page, /buildMusicAlbumVerifiedReleaseIdentity/);
  assert.match(page, /releaseIdentity\.status === 'verified-identity-only'/);
  assert.match(page, /초동 판매량: 적격 증빙 대기/);
  assert.doesNotMatch(page, /79,940|79940/);
});
