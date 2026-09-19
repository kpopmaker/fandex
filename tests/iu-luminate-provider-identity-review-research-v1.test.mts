import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildIuLuminateProviderIdentityDiscoveryPlans,
  evaluateIuLuminateProviderIdentityCandidate,
  IU_LUMINATE_PROVIDER_IDENTITY_REVIEW_RESEARCH_DESCRIPTOR,
  IU_LUMINATE_RETAIL_BARCODE_EVIDENCE_RESEARCH,
  validateIuLuminateProviderIdentityPair,
} from '../lib/alternative-evidence/iuLuminateProviderIdentityReviewResearch';
import {
  IU_PIECES_RELEASE_FAMILY_ID,
  IU_PIECES_RELEASE_ID,
} from '../lib/alternative-evidence/iuPiecesResearchEvidence';
import {
  IU_THE_WINNING_RELEASE_FAMILY_ID,
  IU_THE_WINNING_RELEASE_ID,
} from '../lib/alternative-evidence/iuTheWinningResearchEvidence';

test('barcode evidence is edition cross-check only and never resolves MRELG by itself', () => {
  assert.equal(IU_LUMINATE_PROVIDER_IDENTITY_REVIEW_RESEARCH_DESCRIPTOR.barcodeAloneMayResolveReleaseGroup, false);
  assert.equal(IU_LUMINATE_PROVIDER_IDENTITY_REVIEW_RESEARCH_DESCRIPTOR.automaticProviderIdentityAcceptanceAllowed, false);
  assert.ok(IU_LUMINATE_RETAIL_BARCODE_EVIDENCE_RESEARCH.every(
    (evidence) => evidence.evidenceRole === 'edition-crosscheck-only',
  ));
});

test('The Winning preserves multiple physical edition barcodes without collapsing them into one edition identity', () => {
  const barcodes = IU_LUMINATE_RETAIL_BARCODE_EVIDENCE_RESEARCH
    .filter((evidence) => evidence.fandexReleaseId === IU_THE_WINNING_RELEASE_ID)
    .map((evidence) => evidence.barcode);
  assert.deepEqual(barcodes, ['8804775368752', '8804775368769']);
});

test('discovery plans resolve provider-native MRELG before extraction', () => {
  const plans = buildIuLuminateProviderIdentityDiscoveryPlans();
  assert.equal(plans.length, 2);
  assert.equal(plans[0].target.fandexReleaseId, IU_THE_WINNING_RELEASE_ID);
  assert.equal(plans[0].state, 'provider-id-resolution-required');
  assert.equal(plans[1].target.fandexReleaseId, IU_PIECES_RELEASE_ID);
  assert.match(plans[1].barcodeMappingQueryTemplate ?? '', /VW_MREL_MRELG_MAP_DS/);
});

test('The Winning candidate requires exact title artist date and human review', () => {
  const unresolved = evaluateIuLuminateProviderIdentityCandidate({
    fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
    fandexReleaseFamilyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
    canonicalTitle: 'The Winning',
    releaseDate: '2024-02-20',
    mrelgId: 'luminate:test:mrelg:winning',
    luminateTitle: 'The Winning',
    luminateDisplayArtist: 'IU',
    luminateReleaseDate: '2024-02-20',
    matchedBarcodes: ['8804775368752', '8804775368769'],
    reviewed: false,
  });
  assert.equal(unresolved.state, 'blocked');
  assert.ok(unresolved.blockers.includes('iu-luminate-provider-identity-human-review-required'));

  const resolved = evaluateIuLuminateProviderIdentityCandidate({
    fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
    fandexReleaseFamilyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
    canonicalTitle: 'The Winning',
    releaseDate: '2024-02-20',
    mrelgId: 'luminate:test:mrelg:winning',
    luminateTitle: 'The Winning',
    luminateDisplayArtist: 'IU',
    luminateReleaseDate: '2024-02-20',
    matchedBarcodes: ['8804775368752', '8804775368769'],
    reviewed: true,
  });
  assert.equal(resolved.state, 'resolved-research');
  assert.equal(resolved.mrelgId, 'luminate:test:mrelg:winning');
});

test('unexpected barcode or wrong release date fails closed', () => {
  const result = evaluateIuLuminateProviderIdentityCandidate({
    fandexReleaseId: IU_PIECES_RELEASE_ID,
    fandexReleaseFamilyId: IU_PIECES_RELEASE_FAMILY_ID,
    canonicalTitle: 'Pieces',
    releaseDate: '2021-12-29',
    mrelgId: 'luminate:test:mrelg:pieces',
    luminateTitle: 'Pieces',
    luminateDisplayArtist: 'IU',
    luminateReleaseDate: '2021-12-30',
    matchedBarcodes: ['9999999999999'],
    reviewed: true,
  });
  assert.equal(result.state, 'blocked');
  assert.ok(result.blockers.includes('iu-luminate-provider-identity-release-date-mismatch'));
  assert.ok(result.blockers.includes('iu-luminate-provider-identity-unexpected-edition-barcode'));
});

test('current and baseline must resolve to distinct provider release groups', () => {
  const current = evaluateIuLuminateProviderIdentityCandidate({
    fandexReleaseId: IU_THE_WINNING_RELEASE_ID,
    fandexReleaseFamilyId: IU_THE_WINNING_RELEASE_FAMILY_ID,
    canonicalTitle: 'The Winning',
    releaseDate: '2024-02-20',
    mrelgId: 'luminate:test:mrelg:same',
    luminateTitle: 'The Winning',
    luminateDisplayArtist: 'IU',
    luminateReleaseDate: '2024-02-20',
    matchedBarcodes: ['8804775368752'],
    reviewed: true,
  });
  const baseline = evaluateIuLuminateProviderIdentityCandidate({
    fandexReleaseId: IU_PIECES_RELEASE_ID,
    fandexReleaseFamilyId: IU_PIECES_RELEASE_FAMILY_ID,
    canonicalTitle: 'Pieces',
    releaseDate: '2021-12-29',
    mrelgId: 'luminate:test:mrelg:same',
    luminateTitle: 'Pieces',
    luminateDisplayArtist: 'IU',
    luminateReleaseDate: '2021-12-29',
    matchedBarcodes: ['8804775236938'],
    reviewed: true,
  });
  assert.deepEqual(validateIuLuminateProviderIdentityPair(current, baseline), [
    'iu-luminate-cross-release-mrelg-reuse-forbidden',
  ]);
});
