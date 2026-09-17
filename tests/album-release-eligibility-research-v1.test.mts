import test from 'node:test';
import assert from 'node:assert/strict';

import type { FandexReleaseIdentity, ReleaseType } from '../lib/alternative-evidence/identityFoundation';
import {
  ALBUM_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR,
  evaluateCanonicalAlbumReleaseEligibility,
  resolveAlbumReleaseFamilyEligibility,
} from '../lib/alternative-evidence/albumReleaseEligibilityResearch';

function release(input: Readonly<{
  id: string;
  family: string | null;
  date: string | null;
  type: ReleaseType;
  artists?: readonly string[];
  resolutionState?: FandexReleaseIdentity['resolutionState'];
  reviewState?: FandexReleaseIdentity['reviewState'];
}>): FandexReleaseIdentity {
  return {
    fandexReleaseId: input.id,
    fandexReleaseFamilyId: input.family,
    canonicalTitle: input.id,
    artistIds: input.artists ?? ['iu'],
    releaseDate: input.date,
    releaseType: input.type,
    label: null,
    territory: null,
    formatFamily: 'unknown',
    reviewState: input.reviewState ?? 'human-reviewed',
    resolutionState: input.resolutionState ?? 'resolved',
  };
}

test('canonical rule selects album/EP/mini-album without numeric thresholds', () => {
  assert.equal(ALBUM_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR.productionRuleSelectedAtCanonicalLayer, true);
  assert.equal(ALBUM_RELEASE_ELIGIBILITY_RESEARCH_DESCRIPTOR.arbitraryNumericThresholdsUsed, false);

  for (const type of ['album', 'full-album', 'ep', 'mini-album'] as const) {
    const decision = evaluateCanonicalAlbumReleaseEligibility(
      release({ id: `r-${type}`, family: `f-${type}`, date: '2024-01-01', type }),
      'iu',
    );
    assert.equal(decision.state, 'eligible');
  }
});

test('single, repackage, compilation, live, OST and soundtrack do not enter the primary baseline', () => {
  for (const type of ['single', 'single-album', 'repackage', 'compilation', 'live-album', 'ost', 'soundtrack', 'unknown'] as const) {
    const decision = evaluateCanonicalAlbumReleaseEligibility(
      release({ id: `r-${type}`, family: `f-${type}`, date: '2024-01-01', type }),
      'iu',
    );
    assert.equal(decision.state, 'ineligible');
    assert.ok(decision.reasons.includes(`release-type-${type}-excluded`));
  }
});

test('sole canonical artist and resolved reviewed identity are required', () => {
  const collaboration = evaluateCanonicalAlbumReleaseEligibility(
    release({ id: 'collab', family: 'f-collab', date: '2024-01-01', type: 'mini-album', artists: ['iu', 'other'] }),
    'iu',
  );
  assert.equal(collaboration.state, 'ineligible');
  assert.ok(collaboration.reasons.includes('canonical-artist-not-sole-release-credit'));

  const unresolved = evaluateCanonicalAlbumReleaseEligibility(
    release({ id: 'unresolved', family: 'f-u', date: '2024-01-01', type: 'mini-album', resolutionState: 'candidate' }),
    'iu',
  );
  assert.equal(unresolved.state, 'unresolved');
});

test('only the earliest eligible primary release in a release family contributes to baseline history', () => {
  const original = release({ id: 'modern-times', family: 'modern-times-family', date: '2013-10-07', type: 'full-album' });
  const sameFamilySecondPrimary = release({ id: 'modern-times-alt-primary', family: 'modern-times-family', date: '2013-10-08', type: 'album' });
  const repackage = release({ id: 'modern-times-epilogue', family: 'modern-times-family', date: '2013-12-20', type: 'repackage' });
  const rows = resolveAlbumReleaseFamilyEligibility([sameFamilySecondPrimary, repackage, original], 'iu');

  assert.equal(rows.find((row) => row.release.fandexReleaseId === 'modern-times')?.familyRole, 'primary-baseline-release');
  assert.equal(rows.find((row) => row.release.fandexReleaseId === 'modern-times-alt-primary')?.familyRole, 'family-extension-excluded');
  assert.equal(rows.find((row) => row.release.fandexReleaseId === 'modern-times-epilogue')?.familyRole, 'not-eligible');
});
