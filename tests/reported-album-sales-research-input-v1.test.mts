import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildReportedAlbumSalesHistory,
  createReportedAlbumSalesObservation,
  type ReportedAlbumSalesObservationDraft,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import {
  buildReportedAlbumSalesResearchInput,
} from '../lib/alternative-evidence/reportedAlbumSalesResearchInput';

type SeedFile = Readonly<{
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

function seedHistory() {
  return buildReportedAlbumSalesHistory(
    seed().drafts.map(createReportedAlbumSalesObservation),
  );
}

test('actual public seed yields a score-free same-semantic Hanteo first-week research input', () => {
  const input = buildReportedAlbumSalesResearchInput(
    seedHistory(),
    '2026-10-05T00:42:23+09:00',
  );

  assert.equal(input.state, 'reviewable');
  assert.equal(input.target.underlyingProvider, 'Hanteo Chart');
  assert.equal(
    input.target.metricSemantic,
    'hanteo-first-week-sales',
  );
  assert.equal(input.target.unit, 'physical-copies');

  assert.equal(input.releaseCount, 116);
  assert.equal(input.artistCount, 21);
  assert.deepEqual(
    new Set(input.includedArtistIds),
    new Set(['aespa', 'ive', 'lesserafim', 'boynextdoor', 'ateez', 'straykids', 'txt', 'seventeen', 'newjeans', 'iu', 'bts', 'twice', 'enhypen', 'riize', 'blackpink', 'jungkook', 'v', 'jennie', 'jimin', 'lisa', 'rose']),
  );
  assert.deepEqual(
    new Set(input.entries.map(entry => entry.releaseTitle)),
    new Set([
      'Armageddon',
      'Rich Man',
      'IVE SECRET',
      'EASY',
      'UNFORGIVEN',
      'GOLDEN HOUR : Part.5',
      'ZERO : FEVER Part.3',
      'ZERO : FEVER Part.1',
      'MAXIDENT',
      '7TH YEAR: 가시덤불에 잠시 바람이 멈췄을 때',
      'The Chaos Chapter: FREEZE',
      'The Dream Chapter: ETERNITY',
      'The Action',
      'SEVENTEENTH HEAVEN',
      'Get Up',
      'LILAC',
      'ARIRANG',
      'READY TO BE',
      'ROMANCE : UNTOLD',
      'BORDER : DAY ONE',
      'THE SIN : VANISH',
      'THE SIN : BLISS',
      'DIMENSION : ANSWER',
      'Eyes wide open',
      'Fame',
      'DEADLINE',
      'GOLDEN',
      'Layover',
      'Ruby',
      'MUSE',
      'Alter Ego',
      'rosie',
      'MY WORLD',
      'Proof',
      'With YOU-th',
      'ORANGE BLOOD',
      'BORN PINK',
      'GOLDEN HOUR : Part.2',
      "I've IVE",
      'FML',
      '★★★★★ (5-STAR)',
      'The Name Chapter: TEMPTATION',
      'HOW?',
      'OMG',
      'RIIZING',
      'FACE',
      'LALISA',
      'R',
      'REVIVE+',
      'CRAZY',
      'HOME',
      'II',
      'DARK BLOOD',
      'SPILL THE FEELS',
      'The Star Chapter: SANCTUARY',
      'SKZ IT TAPE ‘DO IT’',
      'TEN: The Story Goes On',
      'MANIFESTO : DAY 1',
      'After LIKE',
      'GOLDEN HOUR : Part.4',
      'Girls',
      'New Jeans',
      'THE ALBUM',
      'BE',
      'Attacca',
      'ODDINARY',
      "minisode 2: Thursday's Child",
      'PUREFLOW pt.1',
      'ODYSSEY',
      'Drama',
      '19.99',
      'No Genre',
      'THE WORLD EP.2 : OUTLAW',
      'THE WORLD EP.FIN : WILL',
      'THE WORLD EP.1 : MOVEMENT',
      'MAP OF THE SOUL : 7',
      'Formula of Love: O+T=<3',
      '17 IS RIGHT HERE',
      'The Name Chapter: FREEFALL',
      'Savage',
      'ANTIFRAGILE',
      'Get A Guitar',
      'Face the Sun',
      'An Ode',
      'Heng:garæ',
      '; [Semicolon]',
      'Your Choice',
      'TEEN, AGE',
      'Al1',
      'YOU MAKE MY DAY',
      'Love & Letter',
      'Going Seventeen',
      'YOU MADE MY DAWN',
      'SECTOR 17',
      'NOEASY',
      'IN LIFE',
      'BETWEEN 1&2',
      'Feel Special',
      'MORE & MORE',
      'FEARLESS',
      'DIMENSION : DILEMMA',
      'How Sweet',
      'Butter',
      'MAP OF THE SOUL : PERSONA',
      "I'VE MINE",
      'IVE SWITCH',
      'DESIRE : UNLEASH',
      'HAPPY BURSTDAY',
      'Whiplash',
      'WHO!',
      'WHY..',
      'minisode 3: TOMORROW',
      'SPAGHETTI',
      'ELEVEN',
      'LOVE DIVE',
      'IVE EMPATHY',
    ]),
  );

  for (const [artistId, releaseTitle] of [
    ['aespa', 'MY WORLD'],
    ['bts', 'Proof'],
    ['twice', 'With YOU-th'],
    ['enhypen', 'ORANGE BLOOD'],
    ['blackpink', 'BORN PINK'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle,
      ),
    );
  }

  for (const [artistId, releaseTitle] of [
    ['ateez', 'GOLDEN HOUR : Part.2'],
    ['ive', "I've IVE"],
    ['seventeen', 'FML'],
    ['straykids', '★★★★★ (5-STAR)'],
    ['txt', 'The Name Chapter: TEMPTATION'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle,
      ),
    );
  }

  for (const [artistId, releaseTitle] of [
    ['boynextdoor', 'HOW?'],
    ['newjeans', 'OMG'],
    ['riize', 'RIIZING'],
    ['jimin', 'FACE'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle,
      ),
    );
  }

  for (const [artistId, releaseTitle] of [
    ['lisa', 'LALISA'],
    ['rose', 'R'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle
          && entry.evidenceQuality
            === 'provider-attributed-secondary',
      ),
    );
  }

  for (const [artistId, releaseTitle] of [
    ['ive', 'REVIVE+'],
    ['lesserafim', 'CRAZY'],
    ['boynextdoor', 'HOME'],
    ['riize', 'II'],
    ['enhypen', 'DARK BLOOD'],
    ['seventeen', 'SPILL THE FEELS'],
    ['txt', 'The Star Chapter: SANCTUARY'],
    ['straykids', 'SKZ IT TAPE ‘DO IT’'],
    ['twice', 'TEN: The Story Goes On'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle
          && entry.evidenceQuality === 'primary-official',
      ),
    );
  }

  for (const [artistId, releaseTitle] of [
    ['enhypen', 'MANIFESTO : DAY 1'],
    ['ive', 'After LIKE'],
    ['ateez', 'GOLDEN HOUR : Part.4'],
    ['aespa', 'Girls'],
    ['newjeans', 'New Jeans'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle,
      ),
    );
  }

  for (const [artistId, releaseTitle] of [
    ['blackpink', 'THE ALBUM'],
    ['bts', 'BE'],
    ['seventeen', 'Attacca'],
    ['straykids', 'ODDINARY'],
    ['txt', "minisode 2: Thursday's Child"],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle,
      ),
    );
  }

  for (const [artistId, releaseTitle] of [
    ['lesserafim', 'PUREFLOW pt.1'],
    ['riize', 'ODYSSEY'],
    ['aespa', 'Drama'],
    ['boynextdoor', '19.99'],
    ['boynextdoor', 'No Genre'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle,
      ),
    );
  }

  for (const [artistId, releaseTitle] of [
    ['ateez', 'THE WORLD EP.2 : OUTLAW'],
    ['ateez', 'THE WORLD EP.FIN : WILL'],
    ['ateez', 'THE WORLD EP.1 : MOVEMENT'],
    ['bts', 'MAP OF THE SOUL : 7'],
    ['twice', 'Formula of Love: O+T=<3'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle,
      ),
    );
  }

  for (const [artistId, releaseTitle] of [
    ['seventeen', '17 IS RIGHT HERE'],
    ['txt', 'The Name Chapter: FREEFALL'],
    ['aespa', 'Savage'],
    ['lesserafim', 'ANTIFRAGILE'],
    ['riize', 'Get A Guitar'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle,
      ),
    );
  }

  for (const [artistId, releaseTitle] of [
    ['seventeen', 'Face the Sun'],
    ['straykids', 'NOEASY'],
    ['twice', 'BETWEEN 1&2'],
    ['lesserafim', 'FEARLESS'],
    ['enhypen', 'DIMENSION : DILEMMA'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle,
      ),
    );
  }

  for (const [artistId, releaseTitle] of [
    ['newjeans', 'How Sweet'],
    ['bts', 'Butter'],
    ['bts', 'MAP OF THE SOUL : PERSONA'],
    ['ive', "I'VE MINE"],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle,
      ),
    );
  }

  for (const [artistId, releaseTitle] of [
    ['ive', 'IVE SWITCH'],
    ['enhypen', 'DESIRE : UNLEASH'],
    ['seventeen', 'HAPPY BURSTDAY'],
    ['aespa', 'Whiplash'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle,
      ),
    );
  }

  for (const [artistId, releaseTitle] of [
    ['boynextdoor', 'WHO!'],
    ['boynextdoor', 'WHY..'],
    ['txt', 'minisode 3: TOMORROW'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle,
      ),
    );
  }

  assert.ok(
    input.entries.some(
      entry =>
        entry.canonicalArtistId === 'lesserafim'
        && entry.releaseTitle === 'SPAGHETTI',
    ),
  );

  for (const [artistId, releaseTitle] of [
    ['ive', 'ELEVEN'],
    ['ive', 'LOVE DIVE'],
    ['ive', 'IVE EMPATHY'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle,
      ),
    );
  }

  assert.ok(
    input.entries.every(
      entry =>
        entry.underlyingProvider === 'Hanteo Chart'
        && entry.metricSemantic === 'hanteo-first-week-sales'
        && entry.unit === 'physical-copies',
    ),
  );
  assert.ok(
    input.entries.every(
      entry =>
        entry.releaseIdentityState === 'candidate'
        || entry.releaseIdentityState === 'resolved',
    ),
  );

  assert.equal(input.minimumCohortSizeDefined, false);
  assert.equal(input.periodInferenceAllowed, false);
  assert.equal(input.crossProviderCombinationAllowed, false);
  assert.equal(input.crossSemanticCombinationAllowed, false);
  assert.equal(input.rawAdditionAllowed, false);
  assert.equal(input.rawAverageAllowed, false);
  assert.equal(input.numericNormalizationDefined, false);
  assert.equal(input.calibrationMethodDefined, false);
  assert.equal(input.scoreFieldsPresent, false);
  assert.equal(input.productEligible, false);
  assert.equal(input.directProviderReplacementAllowed, false);
});

test('upgraded IVE SWITCH evidence enters the research input while provider-mismatched Circle rows remain excluded', () => {
  const input = buildReportedAlbumSalesResearchInput(
    seedHistory(),
    '2026-10-05T00:42:23+09:00',
  );

  assert.ok(
    input.entries.some(
      entry =>
        entry.canonicalArtistId === 'ive'
        && entry.releaseTitle === 'IVE SWITCH',
    ),
  );
  assert.equal(
    input.exclusions.filter(
      exclusion =>
        exclusion.canonicalArtistId === 'ive'
        && exclusion.releaseTitle === 'IVE SWITCH'
        && exclusion.reasons.includes('not-research-usable'),
    ).length,
    0,
  );

  assert.ok(
    input.entries.some(
      entry =>
        entry.canonicalArtistId === 'boynextdoor'
        && entry.releaseTitle === 'The Action',
    ),
  );

  assert.ok(
    input.entries.some(
      entry =>
        entry.canonicalArtistId === 'iu'
        && entry.releaseTitle === 'LILAC',
    ),
  );

  for (const [artistId, releaseTitle] of [
    ['jimin', 'MUSE'],
    ['lisa', 'Alter Ego'],
    ['rose', 'rosie'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle
          && entry.evidenceQuality
            === 'provider-attributed-secondary',
      ),
    );
    assert.equal(
      input.exclusions.some(
        item =>
          item.canonicalArtistId === artistId
          && item.releaseTitle === releaseTitle,
      ),
      false,
    );
  }

  for (const [artistId, releaseTitle] of [
    ['bts', 'ARIRANG'],
    ['twice', 'READY TO BE'],
    ['enhypen', 'ROMANCE : UNTOLD'],
    ['riize', 'Fame'],
  ] as const) {
    assert.ok(
      input.entries.some(
        entry =>
          entry.canonicalArtistId === artistId
          && entry.releaseTitle === releaseTitle
          && entry.evidenceQuality === 'primary-official',
      ),
    );
  }
});

test('Circle distribution and retail observations never enter the Hanteo first-week input', () => {
  const input = buildReportedAlbumSalesResearchInput(
    seedHistory(),
    '2026-10-05T00:42:23+09:00',
  );

  assert.ok(
    input.entries.every(
      entry => entry.underlyingProvider === 'Hanteo Chart',
    ),
  );

  const circleExclusions = input.exclusions.filter(
    exclusion =>
      exclusion.releaseTitle === 'IVE SWITCH'
      && exclusion.reasons.includes('provider-mismatch'),
  );
  assert.equal(circleExclusions.length, 2);
  assert.ok(
    circleExclusions.every(exclusion =>
      exclusion.reasons.includes('metric-semantic-mismatch'),
    ),
  );
});

test('explicit seven-day period is required and a malformed first-week window is not inferred', () => {
  const base = seed().drafts.find(
    draft =>
      draft.canonicalArtistId === 'aespa'
      && draft.metricSemantic === 'hanteo-first-week-sales',
  );
  assert.ok(base);

  const malformed = createReportedAlbumSalesObservation({
    ...base,
    providerPeriodStart: '2024-05-27',
    providerPeriodEnd: '2024-06-03',
    supportingEvidence: [
      {
        ...base.supportingEvidence[0],
        evidenceId: 'malformed-eight-day-period',
        sourceUrl: 'https://example.com/malformed-period',
      },
    ],
  });

  const input = buildReportedAlbumSalesResearchInput(
    buildReportedAlbumSalesHistory([malformed]),
    '2026-10-03T00:20:00+09:00',
  );

  assert.equal(input.state, 'insufficient-evidence');
  assert.equal(input.entries.length, 0);
  assert.deepEqual(
    input.exclusions[0].reasons,
    ['provider-period-not-seven-calendar-days'],
  );
});

test('revision-aware as-of research input exposes only the value known at that time', () => {
  const baseDraft = seed().drafts.find(
    draft =>
      draft.canonicalArtistId === 'lesserafim'
      && draft.release.releaseTitle === 'EASY',
  );
  assert.ok(baseDraft);

  const original =
    createReportedAlbumSalesObservation(baseDraft);
  const revised =
    createReportedAlbumSalesObservation({
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
          evidenceId: 'revision:lesserafim-easy-input',
          sourceUrl: 'https://example.com/revision-input',
          collectedAt: '2026-10-03T09:00:00+09:00',
          sourcePublicationDate: '2026-10-03',
        },
      ],
    });

  const history = buildReportedAlbumSalesHistory([
    original,
    revised,
  ]);

  const before = buildReportedAlbumSalesResearchInput(
    history,
    '2026-10-03T08:59:59+09:00',
  );
  assert.deepEqual(
    before.entries.map(entry => entry.value),
    [989_268],
  );

  const after = buildReportedAlbumSalesResearchInput(
    history,
    '2026-10-03T09:00:00+09:00',
  );
  assert.deepEqual(
    after.entries.map(entry => entry.value),
    [990_000],
  );
  assert.equal(after.entries.length, 1);
  assert.equal(after.rawAdditionAllowed, false);
});

test('conflicting active values in the target semantic fail the research input closed', () => {
  const baseDraft = seed().drafts.find(
    draft =>
      draft.canonicalArtistId === 'aespa'
      && draft.release.releaseTitle === 'Armageddon'
      && draft.supportingEvidence[0]?.sourceTier
        === 'tier-a-primary-official',
  );
  assert.ok(baseDraft);

  const conflictDraft: ReportedAlbumSalesObservationDraft = {
    ...baseDraft,
    value: 1_154_700,
    supportingEvidence: [
      {
        ...baseDraft.supportingEvidence[0],
        evidenceId: 'research-input-conflict',
        reportingSource: 'Reviewed conflict source',
        sourceUrl: 'https://example.com/research-input-conflict',
        sourceTier: 'tier-b-provider-attributed-reputable',
      },
    ],
  };

  const history = buildReportedAlbumSalesHistory([
    createReportedAlbumSalesObservation(baseDraft),
    createReportedAlbumSalesObservation(conflictDraft),
  ]);
  const input = buildReportedAlbumSalesResearchInput(
    history,
    '2026-10-03T00:20:00+09:00',
  );

  assert.equal(input.state, 'conflicting-evidence');
  assert.equal(input.entries.length, 0);
  assert.equal(input.exclusions.length, 2);
  assert.ok(
    input.exclusions.every(exclusion =>
      exclusion.reasons.includes('conflicting-active-scope'),
    ),
  );
});

test('as-of before evidence collection remains insufficient instead of treating missing as zero', () => {
  const input = buildReportedAlbumSalesResearchInput(
    seedHistory(),
    '2026-10-01T23:59:59+09:00',
  );

  assert.equal(input.state, 'insufficient-evidence');
  assert.equal(input.entries.length, 0);
  assert.equal(input.releaseCount, 0);
  assert.equal(input.artistCount, 0);
  assert.equal(input.numericNormalizationDefined, false);
});

test('input fingerprint is deterministic and bound to the as-of research snapshot', () => {
  const history = seedHistory();

  const first = buildReportedAlbumSalesResearchInput(
    history,
    '2026-10-03T00:20:00+09:00',
  );
  const second = buildReportedAlbumSalesResearchInput(
    history,
    '2026-10-03T00:20:00+09:00',
  );
  const later = buildReportedAlbumSalesResearchInput(
    history,
    '2026-10-03T23:59:59+09:00',
  );

  assert.equal(
    first.inputFingerprint,
    second.inputFingerprint,
  );
  assert.notEqual(
    first.inputFingerprint,
    later.inputFingerprint,
  );
});
