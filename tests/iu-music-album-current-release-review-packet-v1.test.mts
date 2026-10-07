import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildReportedAlbumSalesCurrentReleaseReviewRequest,
  validateReportedAlbumSalesCurrentReleaseBinding,
} from '../lib/alternative-evidence/reportedAlbumSalesCurrentReleaseReview';

const packet = JSON.parse(
  readFileSync(
    'data/fandex-cloud-v10/product/iu_music_album_current_release_review_packet_v1.json',
    'utf8',
  ),
);
const binding = JSON.parse(
  readFileSync(
    'data/fandex-cloud-v10/product/iu_music_album_current_release_binding_v1.json',
    'utf8',
  ),
);

test('IU current release reviewer packet matches the deterministic review request and approved binding', () => {
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
  assert.equal(packet.decisionMaterialized, true);
  assert.equal(packet.bindingMaterialized, true);
  assert.equal(
    packet.decision.conclusion,
    'verified-latest-physical-release',
  );
  assert.equal(
    packet.decision.canonicalReleaseId,
    'release:iu:a-flower-bookmark-3:2025-05-28',
  );
  assert.equal(packet.decision.editionResolutionState, 'release-level');
  assert.equal(packet.decision.canonicalEditionId, null);
  assert.equal(binding.requestId, packet.request.requestId);
  assert.equal(
    binding.canonicalReleaseId,
    packet.decision.canonicalReleaseId,
  );
  assert.equal(
    validateReportedAlbumSalesCurrentReleaseBinding(binding),
    true,
  );
  assert.equal(packet.autoVerified, false);
  assert.equal(packet.productActivationAuthorized, false);
  assert.equal(packet.publicPublicationAuthorized, false);
});

test('review packet keeps standard CD and CDP as edition candidates under the approved release-level resolution', () => {
  assert.deepEqual(
    packet.editionCandidateFacts.map(
      (entry: { candidateEdition: string }) =>
        entry.candidateEdition,
    ),
    ['standard-cd', 'cdp-limited'],
  );
  assert.equal(packet.decision.editionResolutionState, 'release-level');
  assert.equal(packet.decision.canonicalEditionId, null);
  assert.equal(binding.candidateEdition, null);
  assert.equal(binding.autoVerified, false);
});
