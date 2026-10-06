import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CIRCLE_EVIDENCE_DESCRIPTOR,
  CIRCLE_PROVIDER_EVIDENCE,
  HANTEO_EVIDENCE_DESCRIPTOR,
  HANTEO_PROVIDER_EVIDENCE,
} from '../lib/alternative-evidence/directProviderEvidence';
import {
  buildReportedAlbumSalesHistory,
  createReportedAlbumSalesObservation,
  type ReportedAlbumSalesObservationDraft,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import {
  buildReportedAlbumSalesResearchInput,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchInput';
import {
  buildReportedAlbumSalesResearchReviewRequestManifest,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchReviewRequestManifest';
import {
  buildReportedAlbumSalesResearchReviewerPacket,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchReviewerPacket';
import {
  buildAlbumProviderAuthorizationRequestManifest,
} from '../lib/product/readiness/albumProviderAuthorizationRequestManifest';
import {
  buildMusicAlbumPointProductionHandoffManifest,
  MUSIC_ALBUM_POINT_PRODUCTION_HANDOFF_VERSION,
} from '../lib/product/readiness/musicAlbumPointProductionHandoff';

type SeedFile = Readonly<{
  drafts: readonly ReportedAlbumSalesObservationDraft[];
}>;

function requests() {
  const seed = JSON.parse(
    readFileSync(
      'data/fandex-cloud-v10/research/reported_album_sales_web_seed_v1.json',
      'utf8',
    ),
  ) as SeedFile;

  const history = buildReportedAlbumSalesHistory(
    seed.drafts.map(createReportedAlbumSalesObservation),
  );
  const researchInput = buildReportedAlbumSalesResearchInput(
    history,
    '2026-10-06T10:23:31+09:00',
  );
  const reviewerPacket =
    buildReportedAlbumSalesResearchReviewerPacket({
      researchInput,
      history,
    });
  const researchReviewRequest =
    buildReportedAlbumSalesResearchReviewRequestManifest(
      reviewerPacket,
    );

  const circle =
    buildAlbumProviderAuthorizationRequestManifest({
      descriptor: CIRCLE_EVIDENCE_DESCRIPTOR,
      providerEvidence: CIRCLE_PROVIDER_EVIDENCE,
    });
  const hanteo =
    buildAlbumProviderAuthorizationRequestManifest({
      descriptor: HANTEO_EVIDENCE_DESCRIPTOR,
      providerEvidence: HANTEO_PROVIDER_EVIDENCE,
    });

  return {
    researchInput,
    researchReviewRequest,
    circle,
    hanteo,
  };
}

test('current exact research and rights requests become one eight-lane Production handoff without completing anything', () => {
  const {
    researchInput,
    researchReviewRequest,
    circle,
    hanteo,
  } = requests();

  assert.equal(researchInput.releaseCount, 127);
  assert.equal(researchInput.artistCount, 21);

  const handoff =
    buildMusicAlbumPointProductionHandoffManifest({
      researchReviewRequest,
      providerAuthorizationRequests: [circle, hanteo],
    });

  assert.equal(
    handoff.contractVersion,
    MUSIC_ALBUM_POINT_PRODUCTION_HANDOFF_VERSION,
  );
  assert.equal(handoff.lanes.length, 8);
  assert.deepEqual(
    handoff.lanes.map(lane => lane.laneId),
    [
      'research-cohort-review',
      'circle-provider-rights',
      'hanteo-provider-rights',
      'shared-music-identity',
      'direct-album-production-history',
      'album-normalization-methodology',
      'music-album-numeric-methodology',
      'product-activation',
    ],
  );

  assert.equal(handoff.currentExternalCompletionCount, 0);
  assert.equal(handoff.safeInternalStateTransitionAvailable, false);
  assert.equal(handoff.productValue, null);
  assert.equal(handoff.numericProductEligible, false);
  assert.equal(handoff.productActivationAuthorized, false);
  assert.equal(handoff.productPublicationAuthorized, false);
  assert.equal(handoff.publicRouteActivated, false);
  assert.equal(handoff.mergeAuthorizationPresent, false);
  assert.equal(handoff.deploymentAuthorizationPresent, false);
  assert.equal(handoff.scheduleActivationAuthorizationPresent, false);
  assert.equal(handoff.reviewerOrRightsDecisionFabricated, false);

  assert.ok(
    handoff.lanes.every(
      lane =>
        lane.completionRecorded === false
        && lane.autoCompletionAllowed === false
        && lane.completionEvidenceRefs.length === 0,
    ),
  );
});

test('handoff preserves explicit ownership and dependency ordering without inventing a priority score', () => {
  const {
    researchReviewRequest,
    circle,
    hanteo,
  } = requests();
  const handoff =
    buildMusicAlbumPointProductionHandoffManifest({
      researchReviewRequest,
      providerAuthorizationRequests: [hanteo, circle],
    });

  const byId = new Map(
    handoff.lanes.map(lane => [lane.laneId, lane]),
  );

  assert.equal(
    byId.get('research-cohort-review')?.owner,
    'research-reviewer',
  );
  assert.equal(
    byId.get('circle-provider-rights')?.owner,
    'provider-rights-reviewer',
  );
  assert.equal(
    byId.get('shared-music-identity')?.owner,
    'shared-artist-registry-owner',
  );
  assert.deepEqual(
    byId.get('direct-album-production-history')
      ?.dependencyLaneIds,
    ['circle-provider-rights', 'hanteo-provider-rights'],
  );
  assert.deepEqual(
    byId.get('album-normalization-methodology')
      ?.dependencyLaneIds,
    ['research-cohort-review', 'direct-album-production-history'],
  );
  assert.deepEqual(
    byId.get('music-album-numeric-methodology')
      ?.dependencyLaneIds,
    ['shared-music-identity', 'album-normalization-methodology'],
  );

  assert.equal(handoff.arbitraryThresholdAllowed, false);
  assert.equal(handoff.arbitraryWeightAllowed, false);
  assert.equal(handoff.rawProviderCombinationAllowed, false);
  assert.equal(handoff.musicAlbumRawCombinationAllowed, false);
});

test('rights policy references are preserved as request refs, never completion evidence', () => {
  const {
    researchReviewRequest,
    circle,
    hanteo,
  } = requests();
  const handoff =
    buildMusicAlbumPointProductionHandoffManifest({
      researchReviewRequest,
      providerAuthorizationRequests: [circle, hanteo],
    });

  const circleLane = handoff.lanes.find(
    lane => lane.laneId === 'circle-provider-rights',
  );
  const hanteoLane = handoff.lanes.find(
    lane => lane.laneId === 'hanteo-provider-rights',
  );

  assert.ok(
    circleLane?.exactRequestRefs.includes(
      'circle:site-footer-ai-ml-tdm-restriction',
    ),
  );
  assert.ok(
    circleLane?.exactRequestRefs.includes(
      'circle:chart-partnership-request',
    ),
  );
  assert.ok(
    hanteoLane?.exactRequestRefs.includes(
      'hanteo:sales-data-copyright-notice',
    ),
  );
  assert.deepEqual(circleLane?.completionEvidenceRefs, []);
  assert.deepEqual(hanteoLane?.completionEvidenceRefs, []);
});

test('handoff ID is deterministic regardless of provider request input order', () => {
  const {
    researchReviewRequest,
    circle,
    hanteo,
  } = requests();

  const first =
    buildMusicAlbumPointProductionHandoffManifest({
      researchReviewRequest,
      providerAuthorizationRequests: [circle, hanteo],
    });
  const second =
    buildMusicAlbumPointProductionHandoffManifest({
      researchReviewRequest,
      providerAuthorizationRequests: [hanteo, circle],
    });

  assert.equal(first.handoffId, second.handoffId);
  assert.deepEqual(
    first.providerAuthorizationRequestIds,
    second.providerAuthorizationRequestIds,
  );
});

test('a populated reviewer request cannot be disguised as an empty handoff dependency', () => {
  const {
    researchReviewRequest,
    circle,
    hanteo,
  } = requests();

  const invalid = Object.freeze({
    ...researchReviewRequest,
    requestContainsApproval: true,
  }) as unknown as typeof researchReviewRequest;

  assert.throws(
    () =>
      buildMusicAlbumPointProductionHandoffManifest({
        researchReviewRequest: invalid,
        providerAuthorizationRequests: [circle, hanteo],
      }),
    /handoff_research_request_not_empty/,
  );
});

test('a populated provider decision cannot be treated as an unresolved handoff request', () => {
  const {
    researchReviewRequest,
    circle,
    hanteo,
  } = requests();

  const invalidCircle = Object.freeze({
    ...circle,
    productionAuthorizationSatisfied: true,
  }) as unknown as typeof circle;

  assert.throws(
    () =>
      buildMusicAlbumPointProductionHandoffManifest({
        researchReviewRequest,
        providerAuthorizationRequests: [
          invalidCircle,
          hanteo,
        ],
      }),
    /handoff_provider_request_not_empty:circle-chart/,
  );
});

test('handoff requires exactly one Circle and one Hanteo request', () => {
  const {
    researchReviewRequest,
    circle,
  } = requests();

  assert.throws(
    () =>
      buildMusicAlbumPointProductionHandoffManifest({
        researchReviewRequest,
        providerAuthorizationRequests: [circle],
      }),
    /provider_request_set_invalid/,
  );

  assert.throws(
    () =>
      buildMusicAlbumPointProductionHandoffManifest({
        researchReviewRequest,
        providerAuthorizationRequests: [circle, circle],
      }),
    /provider_request_set_invalid/,
  );
});
