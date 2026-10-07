import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildReportedAlbumSalesCurrentReleaseReviewRequest,
} from '../lib/alternative-evidence/reportedAlbumSalesCurrentReleaseReview';

const packet = JSON.parse(
  readFileSync(
    'data/fandex-cloud-v10/product/iu_music_album_current_release_review_packet_v1.json',
    'utf8',
  ),
);

test('IU current release reviewer packet matches the deterministic review request contract', () => {
  const built = buildReportedAlbumSalesCurrentReleaseReviewRequest({
    canonicalArtistId: packet.request.canonicalArtistId,
    releaseTitle: packet.request.releaseTitle,
    releaseDate: packet.request.releaseDate,
    candidateCanonicalReleaseId:
      packet.request.candidateCanonicalReleaseId,
    candidateEdition: packet.request.candidateEdition,
    evidenceRefs: packet.request.evidenceRefs,
  });

  assert.deepEqual(built, packet.request);
  assert.equal(packet.decision, null);
  assert.equal(packet.decisionMaterialized, false);
  assert.equal(packet.bindingMaterialized, false);
  assert.equal(packet.autoVerified, false);
  assert.equal(packet.productActivationAuthorized, false);
  assert.equal(packet.publicPublicationAuthorized, false);
});

test('review packet exposes standard CD and CDP as distinct edition candidates without choosing one', () => {
  assert.deepEqual(
    packet.editionCandidateFacts.map(
      (entry: { candidateEdition: string }) =>
        entry.candidateEdition,
    ),
    ['standard-cd', 'cdp-limited'],
  );
  assert.ok(
    packet.reviewQuestions.includes(
      'is-first-week-scope-release-level-or-edition-specific',
    ),
  );
  assert.ok(
    packet.reviewQuestions.includes(
      'does-the-july-cdp-limited-edition-require-a-distinct-canonical-edition-id',
    ),
  );
});
