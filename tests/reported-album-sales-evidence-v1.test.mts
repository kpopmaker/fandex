import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildReportedAlbumSalesHistory,
  createReportedAlbumSalesObservation,
  dedupeReportedAlbumSalesObservations,
  readReportedAlbumSalesHistoryAsOf,
  type ReportedAlbumSalesObservationDraft,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';

type SeedFile = Readonly<{
  contractVersion: 'reported-album-sales-web-seed-v1';
  lifecycle: 'research';
  collectedAt: string;
  cohortBasis: string;
  drafts: readonly ReportedAlbumSalesObservationDraft[];
}>;

function seed(): SeedFile {
  return JSON.parse(
    readFileSync(
      'data/fandex-cloud-v10/research/reported_album_sales_web_seed_v1.json',
      'utf8',
    ),
  ) as SeedFile;
}

function observations() {
  return seed().drafts.map(createReportedAlbumSalesObservation);
}

test('public web seed keeps the requested research/shadow boundary', () => {
  const input = seed();
  assert.equal(input.contractVersion, 'reported-album-sales-web-seed-v1');
  assert.equal(input.lifecycle, 'research');
  assert.equal(input.drafts.length, 136);

  const built = observations();
  assert.ok(built.every(item => item.productEligible === false));
  assert.ok(
    built.every(
      item => item.directProviderReplacementAllowed === false,
    ),
  );
  assert.ok(built.every(item => item.scoreFieldsPresent === false));
});

test('same underlying Hanteo observation reported by multiple sources dedupes to one observation with multiple supporting evidence records', () => {
  const deduped =
    dedupeReportedAlbumSalesObservations(observations());

  assert.equal(deduped.length, 134);

  const armageddon = deduped.find(
    item =>
      item.canonicalArtistId === 'aespa'
      && item.release.releaseTitle === 'Armageddon'
      && item.metricSemantic === 'hanteo-first-week-sales',
  );
  assert.ok(armageddon);
  assert.equal(armageddon.value, 1_154_742);
  assert.equal(armageddon.supportingEvidence.length, 2);
  assert.deepEqual(
    new Set(armageddon.sourceTiers),
    new Set([
      'tier-a-primary-official',
      'tier-c-discovery-only',
    ]),
  );
  assert.equal(armageddon.evidenceQuality, 'primary-official');
  assert.equal(armageddon.researchUsable, true);
  assert.equal(
    armageddon.blockers.includes('discovery-only'),
    false,
  );
});

test('seed expands official Hanteo coverage while preserving provider/semantic separation', () => {
  const deduped =
    dedupeReportedAlbumSalesObservations(observations());
  const artists = new Set(
    deduped.map(item => item.canonicalArtistId),
  );

  assert.deepEqual(
    artists,
    new Set(['aespa', 'ive', 'lesserafim', 'boynextdoor', 'ateez', 'straykids', 'txt', 'seventeen', 'newjeans', 'iu', 'bts', 'twice', 'enhypen', 'riize', 'blackpink', 'jungkook', 'v', 'jennie', 'jimin', 'lisa', 'rose']),
  );

  const hanteo = deduped.filter(
    item => item.underlyingProvider === 'Hanteo Chart',
  );
  const circle = deduped.filter(
    item => item.underlyingProvider === 'Circle Chart',
  );
  assert.equal(hanteo.length, 132);
  assert.equal(circle.length, 2);

  const hanteoFirstWeek = hanteo.filter(
    item => item.metricSemantic === 'hanteo-first-week-sales',
  );
  assert.equal(hanteoFirstWeek.length, 132);
  assert.equal(
    hanteoFirstWeek.filter(item => item.researchUsable).length,
    132,
  );

  for (const [artistId, title, value] of [
    ['bts', 'ARIRANG', 4_169_464],
    ['twice', 'READY TO BE', 651_205],
    ['enhypen', 'ROMANCE : UNTOLD', 2_344_749],
    ['riize', 'Fame', 667_616],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === title,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.evidenceQuality, 'primary-official');
    assert.equal(item.researchUsable, true);
    assert.equal(item.sourceTiers[0], 'tier-a-primary-official');
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd, quality] of [
    ['aespa', 'MY WORLD', 1_698_784, '2023-05-08', '2023-05-14', 'primary-official'],
    ['bts', 'Proof', 2_752_496, '2022-06-10', '2022-06-16', 'provider-attributed-secondary'],
    ['twice', 'With YOU-th', 1_063_615, '2024-02-23', '2024-02-29', 'provider-attributed-secondary'],
    ['enhypen', 'ORANGE BLOOD', 1_871_269, '2023-11-17', '2023-11-23', 'provider-attributed-secondary'],
    ['blackpink', 'BORN PINK', 1_542_950, '2022-09-16', '2022-09-22', 'provider-attributed-secondary'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, quality);
    assert.equal(item.researchUsable, true);
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd, quality] of [
    ['ateez', 'GOLDEN HOUR : Part.2', 1_416_444, '2024-11-15', '2024-11-21', 'primary-official'],
    ['ive', "I've IVE", 1_102_107, '2023-04-10', '2023-04-16', 'primary-official'],
    ['seventeen', 'FML', 4_550_214, '2023-04-24', '2023-04-30', 'provider-attributed-secondary'],
    ['straykids', '★★★★★ (5-STAR)', 4_617_499, '2023-06-02', '2023-06-08', 'provider-attributed-secondary'],
    ['txt', 'The Name Chapter: TEMPTATION', 2_180_889, '2023-01-27', '2023-02-02', 'provider-attributed-secondary'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, quality);
    assert.equal(item.researchUsable, true);
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd, quality] of [
    ['boynextdoor', 'HOW?', 531_911, '2024-04-15', '2024-04-21', 'primary-official'],
    ['newjeans', 'OMG', 701_241, '2023-01-02', '2023-01-08', 'provider-attributed-secondary'],
    ['riize', 'RIIZING', 1_255_015, '2024-06-17', '2024-06-23', 'provider-attributed-secondary'],
    ['jimin', 'FACE', 1_454_223, '2023-03-24', '2023-03-30', 'provider-attributed-secondary'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, quality);
    assert.equal(item.researchUsable, true);
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd] of [
    ['lisa', 'LALISA', 736_221, '2021-09-10', '2021-09-16'],
    ['rose', 'R', 448_089, '2021-03-16', '2021-03-22'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(
      item.evidenceQuality,
      'provider-attributed-secondary',
    );
    assert.equal(item.researchUsable, true);
  }

  const roseR = hanteoFirstWeek.find(
    observation =>
      observation.canonicalArtistId === 'rose'
      && observation.release.releaseTitle === 'R',
  );
  assert.ok(roseR);
  assert.deepEqual(
    new Set(roseR.sourceTiers),
    new Set([
      'tier-b-provider-attributed-reputable',
      'tier-c-discovery-only',
    ]),
  );

  for (const [artistId, releaseTitle, value, periodStart, periodEnd] of [
    ['ive', 'REVIVE+', 667_234, '2026-02-23', '2026-03-01'],
    ['lesserafim', 'CRAZY', 677_687, '2024-08-30', '2024-09-05'],
    ['boynextdoor', 'HOME', 1_085_715, '2026-06-08', '2026-06-14'],
    ['riize', 'II', 1_289_450, '2026-06-15', '2026-06-21'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, 'primary-official');
    assert.equal(item.researchUsable, true);
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd] of [
    ['enhypen', 'DARK BLOOD', 1_322_516, '2023-05-22', '2023-05-28'],
    ['seventeen', 'SPILL THE FEELS', 3_160_611, '2024-10-14', '2024-10-20'],
    ['txt', 'The Star Chapter: SANCTUARY', 1_579_339, '2024-11-04', '2024-11-10'],
    ['straykids', 'SKZ IT TAPE ‘DO IT’', 2_207_660, '2025-11-21', '2025-11-27'],
    ['twice', 'TEN: The Story Goes On', 251_604, '2025-10-10', '2025-10-16'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, 'primary-official');
    assert.equal(item.researchUsable, true);
    assert.equal(item.sourceTiers[0], 'tier-a-primary-official');
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd, quality] of [
    ['enhypen', 'MANIFESTO : DAY 1', 1_241_112, '2022-07-04', '2022-07-10', 'primary-official'],
    ['ive', 'After LIKE', 924_363, '2022-08-22', '2022-08-28', 'primary-official'],
    ['ateez', 'GOLDEN HOUR : Part.4', 1_544_168, '2026-02-06', '2026-02-12', 'primary-official'],
    ['aespa', 'Girls', 1_126_068, '2022-07-08', '2022-07-14', 'provider-attributed-secondary'],
    ['newjeans', 'New Jeans', 311_271, '2022-08-08', '2022-08-14', 'provider-attributed-secondary'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, quality);
    assert.equal(item.researchUsable, true);
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd, quality] of [
    ['blackpink', 'THE ALBUM', 689_066, '2020-10-06', '2020-10-12', 'primary-official'],
    ['bts', 'BE', 2_274_882, '2020-11-20', '2020-11-26', 'primary-official'],
    ['seventeen', 'Attacca', 1_335_862, '2021-10-22', '2021-10-28', 'provider-attributed-secondary'],
    ['straykids', 'ODDINARY', 853_021, '2022-03-18', '2022-03-24', 'provider-attributed-secondary'],
    ['txt', "minisode 2: Thursday's Child", 1_248_370, '2022-05-09', '2022-05-15', 'provider-attributed-secondary'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, quality);
    assert.equal(item.researchUsable, true);
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd, quality] of [
    ['lesserafim', 'PUREFLOW pt.1', 559_207, '2026-05-22', '2026-05-28', 'primary-official'],
    ['riize', 'ODYSSEY', 1_797_267, '2025-05-19', '2025-05-25', 'primary-official'],
    ['aespa', 'Drama', 1_130_379, '2023-11-10', '2023-11-16', 'provider-attributed-secondary'],
    ['boynextdoor', '19.99', 759_156, '2024-09-09', '2024-09-15', 'provider-attributed-secondary'],
    ['boynextdoor', 'No Genre', 1_166_419, '2025-05-13', '2025-05-19', 'provider-attributed-secondary'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, quality);
    assert.equal(item.researchUsable, true);
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd, quality] of [
    ['ateez', 'THE WORLD EP.2 : OUTLAW', 1_521_275, '2023-06-16', '2023-06-22', 'provider-attributed-secondary'],
    ['ateez', 'THE WORLD EP.FIN : WILL', 1_707_870, '2023-12-01', '2023-12-07', 'provider-attributed-secondary'],
    ['ateez', 'THE WORLD EP.1 : MOVEMENT', 936_055, '2022-07-29', '2022-08-04', 'provider-attributed-secondary'],
    ['bts', 'MAP OF THE SOUL : 7', 3_378_633, '2020-02-21', '2020-02-27', 'primary-official'],
    ['twice', 'Formula of Love: O+T=<3', 318_840, '2021-11-12', '2021-11-18', 'provider-attributed-secondary'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, quality);
    assert.equal(item.researchUsable, true);
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd, quality] of [
    ['seventeen', '17 IS RIGHT HERE', 2_967_937, '2024-04-29', '2024-05-05', 'provider-attributed-secondary'],
    ['txt', 'The Name Chapter: FREEFALL', 2_251_959, '2023-10-13', '2023-10-19', 'provider-attributed-secondary'],
    ['aespa', 'Savage', 276_877, '2021-10-05', '2021-10-11', 'provider-attributed-secondary'],
    ['lesserafim', 'ANTIFRAGILE', 567_673, '2022-10-17', '2022-10-23', 'provider-attributed-secondary'],
    ['riize', 'Get A Guitar', 1_016_849, '2023-09-04', '2023-09-10', 'provider-attributed-secondary'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, quality);
    assert.equal(item.researchUsable, true);
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd, quality] of [
    ['seventeen', 'Face the Sun', 2_067_769, '2022-05-27', '2022-06-02', 'provider-attributed-secondary'],
    ['straykids', 'NOEASY', 641_589, '2021-08-23', '2021-08-29', 'provider-attributed-secondary'],
    ['twice', 'BETWEEN 1&2', 532_622, '2022-08-26', '2022-09-01', 'provider-attributed-secondary'],
    ['lesserafim', 'FEARLESS', 307_450, '2022-05-02', '2022-05-08', 'provider-attributed-secondary'],
    ['enhypen', 'DIMENSION : DILEMMA', 818_716, '2021-10-12', '2021-10-18', 'provider-attributed-secondary'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, quality);
    assert.equal(item.researchUsable, true);
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd, quality] of [
    ['newjeans', 'How Sweet', 884_717, '2024-05-24', '2024-05-30', 'corroborated-secondary'],
    ['newjeans', 'Supernatural', 721_639, '2024-06-21', '2024-06-27', 'provider-attributed-secondary'],
    ['bts', 'Butter', 1_975_364, '2021-07-09', '2021-07-15', 'provider-attributed-secondary'],
    ['bts', 'MAP OF THE SOUL : PERSONA', 2_130_480, '2019-04-12', '2019-04-18', 'primary-official'],
    ['ive', "I'VE MINE", 1_605_948, '2023-10-13', '2023-10-19', 'provider-attributed-secondary'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, quality);
    assert.equal(item.researchUsable, true);
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd, quality] of [
    ['enhypen', 'DESIRE : UNLEASH', 2_145_499, '2025-06-05', '2025-06-11', 'provider-attributed-secondary'],
    ['seventeen', 'HAPPY BURSTDAY', 2_521_208, '2025-05-26', '2025-06-01', 'provider-attributed-secondary'],
    ['aespa', 'Whiplash', 913_234, '2024-10-21', '2024-10-27', 'provider-attributed-secondary'],
    ['ive', 'IVE SWITCH', 1_318_467, '2024-04-29', '2024-05-05', 'provider-attributed-secondary'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, quality);
    assert.equal(item.researchUsable, true);
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd, quality] of [
    ['boynextdoor', 'WHO!', 110_442, '2023-05-30', '2023-06-05', 'provider-attributed-secondary'],
    ['boynextdoor', 'WHY..', 449_218, '2023-09-04', '2023-09-10', 'provider-attributed-secondary'],
    ['txt', 'minisode 3: TOMORROW', 1_546_433, '2024-04-01', '2024-04-07', 'provider-attributed-secondary'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, quality);
    assert.equal(item.researchUsable, true);
  }

  {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === 'lesserafim'
        && observation.release.releaseTitle === 'SPAGHETTI',
    );
    assert.ok(item);
    assert.equal(item.value, 464_698);
    assert.equal(item.providerPeriodStart, '2025-10-24');
    assert.equal(item.providerPeriodEnd, '2025-10-30');
    assert.equal(item.evidenceQuality, 'primary-official');
    assert.equal(item.researchUsable, true);
  }

  for (const [artistId, releaseTitle, value, periodStart, periodEnd, quality] of [
    ['ive', 'ELEVEN', 152_229, '2021-12-01', '2021-12-07', 'provider-attributed-secondary'],
    ['ive', 'LOVE DIVE', 338_141, '2022-04-05', '2022-04-11', 'provider-attributed-secondary'],
    ['ive', 'IVE EMPATHY', 1_048_048, '2025-02-03', '2025-02-09', 'primary-official'],
    ['seventeen', 'An Ode', 700_863, '2019-09-16', '2019-09-22', 'provider-attributed-secondary'],
    ['seventeen', 'Heng:garæ', 1_097_891, '2020-06-22', '2020-06-28', 'provider-attributed-secondary'],
    ['seventeen', '; [Semicolon]', 932_054, '2020-10-19', '2020-10-25', 'provider-attributed-secondary'],
    ['seventeen', 'Your Choice', 1_364_127, '2021-06-18', '2021-06-24', 'provider-attributed-secondary'],
    ['seventeen', 'TEEN, AGE', 215_669, '2017-11-06', '2017-11-12', 'provider-attributed-secondary'],
    ['seventeen', 'Al1', 192_399, '2017-05-22', '2017-05-28', 'provider-attributed-secondary'],
    ['seventeen', 'YOU MAKE MY DAY', 274_218, '2018-07-16', '2018-07-22', 'provider-attributed-secondary'],
    ['seventeen', 'Love & Letter', 80_285, '2016-04-25', '2016-05-01', 'provider-attributed-secondary'],
    ['seventeen', 'Going Seventeen', 131_998, '2016-12-05', '2016-12-11', 'corroborated-secondary'],
    ['seventeen', 'YOU MADE MY DAWN', 338_153, '2019-01-21', '2019-01-27', 'provider-attributed-secondary'],
    ['seventeen', 'SECTOR 17', 1_126_104, '2022-07-18', '2022-07-24', 'provider-attributed-secondary'],
    ['twice', 'Feel Special', 154_028, '2019-09-23', '2019-09-29', 'corroborated-secondary'],
    ['twice', 'MORE & MORE', 332_416, '2020-06-01', '2020-06-07', 'provider-attributed-secondary'],
    ['aespa', 'Rich Man', 1_088_340, '2025-09-05', '2025-09-11', 'primary-official'],
    ['aespa', 'LEMONADE', 909_167, '2026-05-29', '2026-06-04', 'primary-official'],
    ['ateez', 'ZERO : FEVER Part.3', 665_350, '2021-09-13', '2021-09-19', 'corroborated-secondary'],
    ['ateez', 'ZERO : FEVER Part.1', 233_399, '2020-07-29', '2020-08-04', 'corroborated-secondary'],
    ['ateez', 'ZERO : FEVER Part.2', 304_585, '2021-03-01', '2021-03-07', 'corroborated-secondary'],
    ['straykids', 'Christmas EveL', 471_312, '2021-11-29', '2021-12-05', 'corroborated-secondary'],
    ['txt', 'The Chaos Chapter: FREEZE', 630_563, '2021-05-31', '2021-06-06', 'corroborated-secondary'],
    ['txt', 'The Chaos Chapter: FIGHT OR ESCAPE', 483_911, '2021-08-17', '2021-08-23', 'provider-attributed-secondary'],
    ['txt', 'The Star Chapter: TOGETHER', 1_760_867, '2025-07-21', '2025-07-27', 'provider-attributed-secondary'],
    ['txt', 'minisode1 : Blue Hour', 303_190, '2020-10-26', '2020-11-01', 'provider-attributed-secondary'],
    ['txt', 'The Dream Chapter: ETERNITY', 181_009, '2020-05-18', '2020-05-24', 'primary-official'],
    ['enhypen', 'THE SIN : VANISH', 2_075_056, '2026-01-16', '2026-01-22', 'primary-official'],
    ['enhypen', 'BORDER : DAY ONE', 280_873, '2020-11-30', '2020-12-06', 'provider-attributed-secondary'],
    ['enhypen', 'BORDER : CARNIVAL', 384_699, '2021-04-26', '2021-05-02', 'provider-attributed-secondary'],
    ['enhypen', 'THE SIN : BLISS', 2_099_048, '2026-08-21', '2026-08-27', 'provider-attributed-secondary'],
    ['enhypen', 'DIMENSION : ANSWER', 514_291, '2022-01-10', '2022-01-16', 'corroborated-secondary'],
    ['twice', 'Eyes wide open', 245_631, '2020-10-27', '2020-11-02', 'primary-official'],
    ['bts', 'Love Yourself: Answer', 868_052, '2018-08-24', '2018-08-30', 'provider-attributed-secondary'],
    ['bts', 'Love Yourself: Her', 759_263, '2017-09-18', '2017-09-24', 'provider-attributed-secondary'],
    ['bts', 'WINGS', 347_426, '2016-10-10', '2016-10-16', 'provider-attributed-secondary'],
    ['bts', 'The Most Beautiful Moment in Life: Young Forever', 164_868, '2016-05-02', '2016-05-08', 'provider-attributed-secondary'],
    ['bts', 'YOU NEVER WALK ALONE', 373_705, '2017-02-13', '2017-02-19', 'provider-attributed-secondary'],
    ['bts', 'LOVE YOURSELF 轉 \'Tear\'', 1_003_524, '2018-05-18', '2018-05-24', 'provider-attributed-secondary'],
    ['straykids', 'Clé : LEVANTER', 83_345, '2019-12-09', '2019-12-15', 'corroborated-secondary'],
    ['blackpink', 'KILL THIS LOVE', 146_094, '2019-04-23', '2019-04-29', 'provider-attributed-secondary'],
  ] as const) {
    const item = hanteoFirstWeek.find(
      observation =>
        observation.canonicalArtistId === artistId
        && observation.release.releaseTitle === releaseTitle,
    );
    assert.ok(item);
    assert.equal(item.value, value);
    assert.equal(item.providerPeriodStart, periodStart);
    assert.equal(item.providerPeriodEnd, periodEnd);
    assert.equal(item.evidenceQuality, quality);
    assert.equal(item.researchUsable, true);
  }

  const circleSemantics = new Set(
    circle.map(item => item.metricSemantic),
  );
  assert.deepEqual(
    circleSemantics,
    new Set([
      'circle-album-distribution-volume',
      'circle-retail-period-sales',
    ]),
  );
});

test('source tiers remain separate from evidence quality', () => {
  const deduped =
    dedupeReportedAlbumSalesObservations(observations());
  const evidence = deduped.flatMap(item =>
    [...item.supportingEvidence]);

  const tierCounts = evidence.reduce<Record<string, number>>(
    (counts, item) => {
      counts[item.sourceTier] =
        (counts[item.sourceTier] ?? 0) + 1;
      return counts;
    },
    {},
  );

  assert.deepEqual(tierCounts, {
    'tier-a-primary-official': 44,
    'tier-c-discovery-only': 11,
    'tier-b-provider-attributed-reputable': 108,
  });

  const iuLilac = deduped.find(
    item =>
      item.canonicalArtistId === 'iu'
      && item.release.releaseTitle === 'LILAC'
      && item.metricSemantic === 'hanteo-first-week-sales',
  );
  assert.ok(iuLilac);
  assert.equal(iuLilac.supportingEvidence.length, 2);
  assert.deepEqual(
    new Set(iuLilac.sourceTiers),
    new Set([
      'tier-b-provider-attributed-reputable',
      'tier-c-discovery-only',
    ]),
  );
  assert.equal(
    iuLilac.evidenceQuality,
    'provider-attributed-secondary',
  );
  assert.equal(iuLilac.researchUsable, true);

  for (const [artistId, releaseTitle, periodStart, periodEnd] of [
    ['jimin', 'MUSE', '2024-07-19', '2024-07-25'],
    ['lisa', 'Alter Ego', '2025-02-28', '2025-03-06'],
    ['rose', 'rosie', '2024-12-06', '2024-12-12'],
  ] as const) {
    const upgraded = deduped.find(
      item =>
        item.canonicalArtistId === artistId
        && item.release.releaseTitle === releaseTitle
        && item.metricSemantic === 'hanteo-first-week-sales',
    );
    assert.ok(upgraded);
    assert.equal(
      upgraded.evidenceQuality,
      'provider-attributed-secondary',
    );
    assert.equal(upgraded.researchUsable, true);
    assert.equal(upgraded.providerPeriodStart, periodStart);
    assert.equal(upgraded.providerPeriodEnd, periodEnd);
    assert.deepEqual(
      new Set(upgraded.sourceTiers),
      new Set([
        'tier-b-provider-attributed-reputable',
        'tier-c-discovery-only',
      ]),
    );
  }

  const unforgiven = deduped.find(
    item =>
      item.release.releaseTitle === 'UNFORGIVEN'
      && item.metricSemantic === 'hanteo-first-week-sales',
  );
  assert.ok(unforgiven);
  assert.deepEqual(
    unforgiven.sourceTiers,
    ['tier-b-provider-attributed-reputable'],
  );
  assert.equal(
    unforgiven.evidenceQuality,
    'provider-attributed-secondary',
  );
  assert.equal(unforgiven.researchUsable, true);

  const iveSwitchUpgraded = deduped.find(
    item =>
      item.release.releaseTitle === 'IVE SWITCH'
      && item.metricSemantic === 'hanteo-first-week-sales',
  );
  assert.ok(iveSwitchUpgraded);
  assert.deepEqual(
    new Set(iveSwitchUpgraded.sourceTiers),
    new Set([
      'tier-c-discovery-only',
      'tier-b-provider-attributed-reputable',
    ]),
  );
  assert.equal(
    iveSwitchUpgraded.evidenceQuality,
    'provider-attributed-secondary',
  );
  assert.equal(iveSwitchUpgraded.researchUsable, true);
});

test('Hanteo first-week, Circle distribution, and Circle retail values for one release remain three distinct observations', () => {
  const deduped =
    dedupeReportedAlbumSalesObservations(observations());
  const iveSwitch = deduped.filter(
    item => item.release.releaseTitle === 'IVE SWITCH',
  );

  assert.equal(iveSwitch.length, 3);
  assert.deepEqual(
    new Set(iveSwitch.map(item => item.metricSemantic)),
    new Set([
      'hanteo-first-week-sales',
      'circle-album-distribution-volume',
      'circle-retail-period-sales',
    ]),
  );
  assert.deepEqual(
    new Set(iveSwitch.map(item => item.value)),
    new Set([1_318_467, 1_594_023, 627_846]),
  );
  assert.equal(
    new Set(iveSwitch.map(item => item.observationId)).size,
    3,
  );
});

test('different values for the same provider/release/period become conflicting evidence instead of being averaged', () => {
  const baseDraft = seed().drafts.find(
    item =>
      item.canonicalArtistId === 'aespa'
      && item.release.releaseTitle === 'Armageddon'
      && item.supportingEvidence[0]?.sourceTier
        === 'tier-a-primary-official',
  );
  assert.ok(baseDraft);

  const changedDraft: ReportedAlbumSalesObservationDraft = {
    ...baseDraft,
    value: 1_154_700,
    supportingEvidence: [
      {
        ...baseDraft.supportingEvidence[0],
        evidenceId: 'conflict:aespa-armageddon',
        sourceUrl: 'https://example.com/conflicting-source',
        sourceTier: 'tier-b-provider-attributed-reputable',
        reportingSource: 'Conflicting reviewed source',
      },
    ],
  };

  const history = buildReportedAlbumSalesHistory([
    createReportedAlbumSalesObservation(baseDraft),
    createReportedAlbumSalesObservation(changedDraft),
  ]);

  assert.equal(history.conflicts.length, 1);
  assert.equal(history.conflicts[0].state, 'conflicting-evidence');
  assert.equal(history.observations.length, 2);
  assert.ok(
    history.observations.every(
      item =>
        item.evidenceQuality === 'conflicting'
        && item.researchUsable === false,
    ),
  );
});

test('explicit revision is visible only after its collection time and never adds to the previous value', () => {
  const baseDraft = seed().drafts.find(
    item =>
      item.canonicalArtistId === 'lesserafim'
      && item.release.releaseTitle === 'EASY',
  );
  assert.ok(baseDraft);
  const original = createReportedAlbumSalesObservation(baseDraft);

  const revisedDraft: ReportedAlbumSalesObservationDraft = {
    ...baseDraft,
    value: 990_000,
    collectedAt: '2026-10-03T09:00:00+09:00',
    revision: {
      state: 'explicit-correction',
      supersedesObservationId: original.observationId,
      revisionObservedAt: '2026-10-03T08:30:00+09:00',
    },
    supportingEvidence: [
      {
        ...baseDraft.supportingEvidence[0],
        evidenceId: 'revision:lesserafim-easy',
        sourceUrl: 'https://example.com/revision-evidence',
        collectedAt: '2026-10-03T09:00:00+09:00',
        sourcePublicationDate: '2026-10-03',
      },
    ],
  };
  const revised = createReportedAlbumSalesObservation(revisedDraft);
  const history = buildReportedAlbumSalesHistory([
    original,
    revised,
  ]);

  const before = readReportedAlbumSalesHistoryAsOf(
    history,
    '2026-10-03T08:59:59+09:00',
  );
  assert.deepEqual(
    before.activeObservations.map(item => item.value),
    [989_268],
  );

  const after = readReportedAlbumSalesHistoryAsOf(
    history,
    '2026-10-03T09:00:00+09:00',
  );
  assert.deepEqual(
    after.activeObservations.map(item => item.value),
    [990_000],
  );
  assert.deepEqual(
    after.supersededObservations.map(item => item.value),
    [989_268],
  );
});

test('unknown or missing value is never represented by numeric zero', () => {
  const baseDraft = seed().drafts[0];

  assert.throws(
    () => createReportedAlbumSalesObservation({
      ...baseDraft,
      value: 0,
    }),
    /missing_must_not_be_zero/,
  );

  const missing = createReportedAlbumSalesObservation({
    ...baseDraft,
    value: null,
    unit: null,
    supportingEvidence: [
      {
        ...baseDraft.supportingEvidence[0],
        evidenceId: 'missing-exact-value',
        sourceUrl: 'https://example.com/no-exact-value',
      },
    ],
  });

  assert.equal(missing.value, null);
  assert.equal(missing.researchUsable, false);
  assert.ok(missing.blockers.includes('exact-value-unavailable'));
  assert.ok(missing.blockers.includes('unit-unknown'));
});

test('research history never becomes a Product or numeric-normalization surface', () => {
  const history = buildReportedAlbumSalesHistory(observations());

  assert.equal(history.historyClass, 'reported-web-research-shadow');
  assert.equal(history.productEligible, false);
  assert.equal(history.directProviderReplacementAllowed, false);
  assert.equal(history.numericNormalizationDefined, false);
  assert.equal(history.scoreFieldsPresent, false);
  assert.equal(history.conflicts.length, 0);
});
