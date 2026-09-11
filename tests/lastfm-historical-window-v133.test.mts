import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LASTFM_EXPECTED_SIGNAL_COUNT,
  LASTFM_CANONICAL_IDENTITIES,
  LASTFM_IDENTITY_QUALITY_GATE_VERSION,
  type LastfmCanonicalSignal,
  type LastfmIdentityQualityGateResult,
} from '../lib/lastfm-signal/identityQualityGate';
import {
  LASTFM_HISTORICAL_WINDOW_DAYS,
  LASTFM_MINIMUM_WINDOW_INTERVALS,
  buildLastfmHistoricalWindowModel,
} from '../lib/lastfm-signal/historicalWindow';
import { LASTFM_REAL_SIGNAL_READ_MODEL_VERSION } from '../lib/lastfm-signal/contracts';

const SNAPSHOT_DATE = '2026-08-14';
const DATES = [
  '2026-08-07',
  '2026-08-08',
  '2026-08-09',
  '2026-08-10',
  '2026-08-11',
  '2026-08-12',
  '2026-08-13',
  SNAPSHOT_DATE,
] as const;

function zeroEffects() {
  return Object.freeze({
    externalCalls: 0 as const,
    databaseReads: 0 as const,
    databaseWrites: 0 as const,
    masterScoreWrites: 0 as const,
    websiteWrites: 0 as const,
  });
}

function incrementsFor(index: number) {
  return {
    listeners: 100 + index * 10,
    playcount: 1_000 + index * 100,
  };
}

function canonicalSignals(): readonly LastfmCanonicalSignal[] {
  return Object.freeze(
    LASTFM_CANONICAL_IDENTITIES.map((identity, index) => {
      const increments = incrementsFor(index);
      return Object.freeze({
        artistId: identity.artistId,
        artistLabel: identity.artistLabel,
        query: identity.expectedQuery,
        resolvedLastfmName: identity.acceptedLastfmNames[0],
        previousDate: '2026-08-13',
        latestDate: SNAPSHOT_DATE,
        collectedAt: '2026-08-14T09:17:00+09:00',
        listeners: 1_000_000 + increments.listeners * 7,
        playcount: 10_000_000 + increments.playcount * 7,
        listenerDelta: increments.listeners,
        playcountDelta: increments.playcount,
        listenerDeltaPerDay: increments.listeners,
        playcountDeltaPerDay: increments.playcount,
        listenerLogNormalized: 50,
        playcountLogNormalized: 50,
        previewPoint: 50,
        sourceRank: index + 1,
        qualityState: 'eligible' as const,
        blockers: Object.freeze([]),
      });
    }),
  );
}

function eligibleGate(
  signals: readonly LastfmCanonicalSignal[] = canonicalSignals(),
): LastfmIdentityQualityGateResult {
  return Object.freeze({
    contractVersion: LASTFM_IDENTITY_QUALITY_GATE_VERSION,
    sourceContractVersion: LASTFM_REAL_SIGNAL_READ_MODEL_VERSION,
    snapshotDate: SNAPSHOT_DATE,
    state: 'eligible' as const,
    reasons: Object.freeze([]),
    expectedSignalCount: LASTFM_EXPECTED_SIGNAL_COUNT,
    resolvedSignalCount: signals.length,
    eligibleSignalCount: signals.filter((signal) => signal.qualityState === 'eligible').length,
    signals,
    digest: 'test-gate-digest',
    effects: zeroEffects(),
  });
}

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function historyCsv(options: Readonly<{
  missingFirstDateForArtist?: string;
  negativeIntervalArtist?: string;
  spikeLatestArtist?: string;
}> = {}) {
  const rows: Array<Array<string | number>> = [];
  LASTFM_CANONICAL_IDENTITIES.forEach((identity, artistIndex) => {
    const increments = incrementsFor(artistIndex);
    DATES.forEach((date, dateIndex) => {
      if (dateIndex === 0 && options.missingFirstDateForArtist === identity.artistLabel) return;
      let listenerOffset = increments.listeners * dateIndex;
      let playcountOffset = increments.playcount * dateIndex;
      if (options.negativeIntervalArtist === identity.artistLabel && dateIndex >= 4) {
        listenerOffset -= increments.listeners * 2;
      }
      if (options.spikeLatestArtist === identity.artistLabel && dateIndex === DATES.length - 1) {
        listenerOffset += increments.listeners * 20;
        playcountOffset += increments.playcount * 20;
      }
      rows.push([
        date,
        identity.artistLabel,
        identity.expectedQuery,
        identity.acceptedLastfmNames[0],
        1_000_000 + listenerOffset,
        10_000_000 + playcountOffset,
        `${date}T09:17:00+09:00`,
        'ok',
      ]);
    });
  });
  const header = [
    'snapshotDate',
    'artist',
    'query',
    'lastfmName',
    'listeners',
    'playcount',
    'collectedAt',
    'status',
  ];
  return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
}

test('v133 historical window builds stable 14-day bounded profiles without writes', () => {
  const result = buildLastfmHistoricalWindowModel(eligibleGate(), historyCsv());
  assert.equal(result.state, 'eligible');
  assert.equal(result.windowDays, LASTFM_HISTORICAL_WINDOW_DAYS);
  assert.equal(result.minimumIntervals, LASTFM_MINIMUM_WINDOW_INTERVALS);
  assert.equal(result.signalCount, 10);
  assert.equal(result.stableSignalCount, 10);
  assert.equal(result.variableSignalCount, 0);
  assert.equal(result.blockedSignalCount, 0);
  assert.equal(result.effects.masterScoreWrites, 0);
  assert.equal(result.effects.websiteWrites, 0);
  assert.ok(result.signals.every((signal) => signal.snapshotCount === 8));
  assert.ok(result.signals.every((signal) => signal.intervalCount === 7));
  assert.ok(result.signals.every((signal) => signal.historicalNormalizedPoint !== null));
  assert.ok(
    result.signals.every(
      (signal) =>
        Number(signal.historicalNormalizedPoint) >= 0 &&
        Number(signal.historicalNormalizedPoint) <= 100,
    ),
  );
});

test('v133 digest is deterministic for identical gate and history inputs', () => {
  const first = buildLastfmHistoricalWindowModel(eligibleGate(), historyCsv());
  const second = buildLastfmHistoricalWindowModel(eligibleGate(), historyCsv());
  assert.equal(first.digest, second.digest);
  assert.deepEqual(first.signals, second.signals);
});

test('v133 uses medians so a one-day spike does not replace the historical center', () => {
  const label = LASTFM_CANONICAL_IDENTITIES[0].artistLabel;
  const signals = canonicalSignals().map((signal) => {
    if (signal.artistLabel !== label) return signal;
    const increments = incrementsFor(0);
    return Object.freeze({
      ...signal,
      listenerDelta: increments.listeners * 21,
      playcountDelta: increments.playcount * 21,
      listenerDeltaPerDay: increments.listeners * 21,
      playcountDeltaPerDay: increments.playcount * 21,
    });
  });
  const result = buildLastfmHistoricalWindowModel(
    eligibleGate(Object.freeze(signals)),
    historyCsv({ spikeLatestArtist: label }),
  );
  const profile = result.signals.find((signal) => signal.artistLabel === label);
  assert.ok(profile);
  assert.equal(profile.medianListenerDeltaPerDay, incrementsFor(0).listeners);
  assert.equal(profile.medianPlaycountDeltaPerDay, incrementsFor(0).playcount);
  assert.notEqual(profile.latestListenerDeltaPerDay, profile.medianListenerDeltaPerDay);
});

test('v133 fails closed when historical data contains a negative interval', () => {
  const label = LASTFM_CANONICAL_IDENTITIES[1].artistLabel;
  const result = buildLastfmHistoricalWindowModel(
    eligibleGate(),
    historyCsv({ negativeIntervalArtist: label }),
  );
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('historical-window-blocked-signals'));
  const profile = result.signals.find((signal) => signal.artistLabel === label);
  assert.ok(profile);
  assert.equal(profile.stabilityState, 'blocked');
  assert.ok(profile.blockers.includes('historical-negative-delta'));
  assert.equal(profile.historicalNormalizedPoint, null);
});

test('v133 blocks an artist with fewer than the minimum required intervals', () => {
  const label = LASTFM_CANONICAL_IDENTITIES[2].artistLabel;
  const result = buildLastfmHistoricalWindowModel(
    eligibleGate(),
    historyCsv({ missingFirstDateForArtist: label }),
  );
  const profile = result.signals.find((signal) => signal.artistLabel === label);
  assert.ok(profile);
  assert.equal(profile.intervalCount, 6);
  assert.equal(profile.stabilityState, 'stable');

  const severelyShortCsv = historyCsv()
    .split('\n')
    .filter((line, index) => {
      if (index === 0) return true;
      if (!line.includes(label)) return true;
      return line.startsWith('2026-08-12') || line.startsWith('2026-08-13') || line.startsWith('2026-08-14');
    })
    .join('\n');
  const blocked = buildLastfmHistoricalWindowModel(eligibleGate(), severelyShortCsv);
  const blockedProfile = blocked.signals.find((signal) => signal.artistLabel === label);
  assert.ok(blockedProfile);
  assert.equal(blockedProfile.stabilityState, 'blocked');
  assert.ok(blockedProfile.blockers.includes('insufficient-window-history'));
});
