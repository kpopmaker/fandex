import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildReportedAlbumSalesArtistHistory,
  buildReportedAlbumSalesReleaseHistory,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchHistory';
import {
  createReportedAlbumSalesObservation,
  type ReportedAlbumSalesObservationDraft,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';

type Seed = Readonly<{
  drafts: readonly ReportedAlbumSalesObservationDraft[];
}>;

function observations() {
  const seed = JSON.parse(
    readFileSync(
      'data/fandex-cloud-v10/research/reported_album_sales_web_seed_v1.json',
      'utf8',
    ),
  ) as Seed;

  return seed.drafts.map(createReportedAlbumSalesObservation);
}

test('release history keeps different album sales semantics separated', () => {
  const history = buildReportedAlbumSalesReleaseHistory(observations());
  const iveSwitch = history.find(
    item => item.releaseTitle === 'IVE SWITCH',
  );

  assert.ok(iveSwitch);
  assert.deepEqual(
    new Set(
      iveSwitch.releaseHistory.map(item => item.metricSemantic),
    ),
    new Set([
      'hanteo-first-week-sales',
      'circle-album-distribution-volume',
      'circle-retail-period-sales',
    ]),
  );
  assert.equal(iveSwitch.productEligible, false);
  assert.equal(iveSwitch.scoreFieldsPresent, false);
});

test('artist history provides longitudinal release view without creating scores', () => {
  const history = buildReportedAlbumSalesArtistHistory(observations());
  const artists = new Set(history.map(item => item.canonicalArtistId));

  assert.deepEqual(
    artists,
    new Set(['aespa', 'ive', 'lesserafim', 'boynextdoor', 'ateez', 'straykids', 'txt', 'seventeen', 'newjeans', 'iu', 'bts', 'twice', 'enhypen', 'riize', 'blackpink', 'jungkook', 'v', 'jennie', 'jimin', 'lisa', 'rose']),
  );

  const aespa = history.find(
    item => item.canonicalArtistId === 'aespa',
  );
  assert.ok(aespa);
  assert.ok(aespa.releases.length >= 1);
  assert.equal(aespa.productEligible, false);
  assert.equal(aespa.scoreFieldsPresent, false);
});

test('history preserves conflict state instead of resolving numeric values', () => {
  const base = observations()[0];
  const conflicting: typeof base = Object.freeze({
    ...base,
    observationId: 'conflict-observation',
    evidenceQuality: 'conflicting',
    researchUsable: false,
  });

  const releaseHistory = buildReportedAlbumSalesReleaseHistory([
    base,
    conflicting,
  ]);

  assert.equal(releaseHistory[0].conflictCount, 1);
  assert.equal(
    releaseHistory[0].researchUsableObservationCount,
    1,
  );
});

test('history does not merge different metric semantics into one numeric series', () => {
  const history = buildReportedAlbumSalesReleaseHistory(observations());

  for (const release of history) {
    for (const metric of release.releaseHistory) {
      assert.ok(metric.observations.length > 0);
    }
  }
});
